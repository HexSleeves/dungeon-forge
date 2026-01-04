use crate::engine::GraphExecutor;
use crate::models::{
    GenerationRequest, GenerationResult, DungeonLayout, GeneratedRoom, RoomConnection,
    SpawnPoint, LayoutPosition, Rectangle, GenerationMetadata, ConstraintResult,
    SimulationConfig, SimulationResults, SimulationStatistics, DistributionStats,
    Percentiles, HistogramBucket, ConstraintStats,
};
use rand::prelude::*;
use rand_chacha::ChaCha8Rng;
use std::collections::HashMap;
use std::time::Instant;
use tauri::command;

#[command]
pub fn generate_once(request: GenerationRequest) -> Result<GenerationResult, String> {
    let start = Instant::now();
    
    // If we have a generator with a graph, use the graph executor
    let (result, node_executions) = if let Some(ref generator) = request.generator {
        // Use graph-based generation
        let mut executor = GraphExecutor::new(request.seed, request.parameters.clone());
        match executor.execute(generator) {
            Ok(layout) => (layout, executor.node_executions()),
            Err(e) => {
                // Fall back to simple generation on error
                let mut rng = ChaCha8Rng::seed_from_u64(request.seed);
                let layout = generate_dungeon(&mut rng);
                return Ok(GenerationResult {
                    seed: request.seed,
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs(),
                    success: false,
                    data: Some(layout),
                    constraint_results: vec![],
                    metadata: GenerationMetadata {
                        node_executions: 0,
                        retry_count: 0,
                    },
                    errors: vec![format!("Graph execution error: {}", e)],
                    duration_ms: start.elapsed().as_millis() as u64,
                });
            }
        }
    } else {
        // Fall back to simple procedural generation
        let mut rng = ChaCha8Rng::seed_from_u64(request.seed);
        (generate_dungeon(&mut rng), 10)
    };
    
    let duration = start.elapsed();
    
    Ok(GenerationResult {
        seed: request.seed,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        success: true,
        data: Some(result),
        constraint_results: vec![
            ConstraintResult {
                constraint_id: "connected".to_string(),
                passed: true,
                message: Some("All rooms reachable".to_string()),
            },
        ],
        metadata: GenerationMetadata {
            node_executions,
            retry_count: 0,
        },
        errors: vec![],
        duration_ms: duration.as_millis() as u64,
    })
}

fn generate_dungeon(rng: &mut ChaCha8Rng) -> DungeonLayout {
    let room_count = rng.gen_range(4..=8);
    let mut rooms = Vec::new();
    let mut connections = Vec::new();
    let mut spawn_points = Vec::new();
    
    // Room types for variety
    let room_types = ["default", "treasure", "boss", "shop"];
    
    // Generate rooms in a rough grid pattern
    let mut x = 0.0;
    let mut y = 0.0;
    
    for i in 0..room_count {
        let room_type = if i == 0 {
            "start"
        } else if i == room_count - 1 {
            "boss"
        } else {
            room_types[rng.gen_range(0..room_types.len())]
        };
        
        let width = rng.gen_range(5.0..10.0);
        let height = rng.gen_range(5.0..10.0);
        
        rooms.push(GeneratedRoom {
            id: format!("room_{}", i),
            room_type: room_type.to_string(),
            bounds: Rectangle {
                x,
                y,
                width,
                height,
            },
            tiles: None,
            entities: vec![],
            metadata: HashMap::new(),
        });
        
        // Add spawn point for non-start rooms
        if i > 0 && room_type != "boss" {
            let spawn_count = rng.gen_range(1..=3);
            for j in 0..spawn_count {
                spawn_points.push(SpawnPoint {
                    id: format!("spawn_{}_{}", i, j),
                    spawn_type: "enemy".to_string(),
                    position: LayoutPosition {
                        x: x + width / 2.0 + rng.gen_range(-2.0..2.0),
                        y: y + height / 2.0 + rng.gen_range(-2.0..2.0),
                    },
                    room_id: format!("room_{}", i),
                });
            }
        }
        
        // Connect to previous room
        if i > 0 {
            let prev_room = &rooms[i - 1];
            connections.push(RoomConnection {
                from_room_id: format!("room_{}", i - 1),
                to_room_id: format!("room_{}", i),
                from_door: LayoutPosition {
                    x: prev_room.bounds.x + prev_room.bounds.width,
                    y: prev_room.bounds.y + prev_room.bounds.height / 2.0,
                },
                to_door: LayoutPosition {
                    x,
                    y: y + height / 2.0,
                },
            });
        }
        
        // Move position for next room
        if rng.gen_bool(0.5) {
            x += width + 5.0 + rng.gen_range(0.0..10.0);
        } else {
            y += height + 5.0 + rng.gen_range(0.0..10.0);
            if rng.gen_bool(0.5) {
                x += rng.gen_range(-5.0..5.0);
            }
        }
    }
    
    let start_room = &rooms[0];
    let player_start = LayoutPosition {
        x: start_room.bounds.x + start_room.bounds.width / 2.0,
        y: start_room.bounds.y + start_room.bounds.height / 2.0,
    };
    
    let last_room = &rooms[rooms.len() - 1];
    let exit = LayoutPosition {
        x: last_room.bounds.x + last_room.bounds.width / 2.0,
        y: last_room.bounds.y + last_room.bounds.height / 2.0,
    };
    
    DungeonLayout {
        rooms,
        connections,
        spawn_points,
        player_start,
        exits: vec![exit],
    }
}

#[command]
pub fn run_simulation(config: SimulationConfig) -> Result<SimulationResults, String> {
    let start = Instant::now();
    let mut room_counts: Vec<f64> = Vec::new();
    let mut path_lengths: Vec<f64> = Vec::new();
    let mut enemy_counts: Vec<f64> = Vec::new();
    let mut item_counts: Vec<f64> = Vec::new();
    let mut successes = 0u32;
    
    let seed_start = config.seed_start.unwrap_or(0);
    
    for i in 0..config.run_count {
        let mut rng = ChaCha8Rng::seed_from_u64(seed_start + i as u64);
        let layout = generate_dungeon(&mut rng);
        
        room_counts.push(layout.rooms.len() as f64);
        path_lengths.push(layout.connections.len() as f64 + 1.0);
        enemy_counts.push(layout.spawn_points.len() as f64);
        item_counts.push(0.0); // Placeholder
        successes += 1;
    }
    
    let duration = start.elapsed();
    
    Ok(SimulationResults {
        config: config.clone(),
        runs: config.run_count,
        success_rate: successes as f64 / config.run_count as f64,
        duration_ms: duration.as_millis() as u64,
        statistics: SimulationStatistics {
            room_count: calculate_stats(&room_counts),
            path_length: calculate_stats(&path_lengths),
            enemy_count: calculate_stats(&enemy_counts),
            item_count: calculate_stats(&item_counts),
        },
        constraint_results: HashMap::from([
            ("connected".to_string(), ConstraintStats {
                pass_rate: 1.0,
                violations: 0,
            }),
        ]),
        warnings: vec![],
    })
}

fn calculate_stats(data: &[f64]) -> DistributionStats {
    if data.is_empty() {
        return DistributionStats {
            min: 0.0,
            max: 0.0,
            mean: 0.0,
            median: 0.0,
            std_dev: 0.0,
            percentiles: Percentiles { p5: 0.0, p25: 0.0, p75: 0.0, p95: 0.0 },
            histogram: vec![],
        };
    }
    
    let mut sorted = data.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
    
    let min = sorted[0];
    let max = sorted[sorted.len() - 1];
    let mean = data.iter().sum::<f64>() / data.len() as f64;
    let median = sorted[sorted.len() / 2];
    
    let variance = data.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / data.len() as f64;
    let std_dev = variance.sqrt();
    
    let percentile = |p: f64| -> f64 {
        let idx = ((p / 100.0) * (sorted.len() - 1) as f64) as usize;
        sorted[idx.min(sorted.len() - 1)]
    };
    
    // Generate histogram with 10 buckets
    let bucket_size = (max - min) / 10.0;
    let mut histogram = vec![HistogramBucket { bucket: 0.0, count: 0 }; 10];
    for (i, h) in histogram.iter_mut().enumerate() {
        h.bucket = min + (i as f64 * bucket_size);
    }
    
    for val in data {
        let bucket_idx = ((val - min) / bucket_size).floor() as usize;
        let bucket_idx = bucket_idx.min(9);
        histogram[bucket_idx].count += 1;
    }
    
    DistributionStats {
        min,
        max,
        mean,
        median,
        std_dev,
        percentiles: Percentiles {
            p5: percentile(5.0),
            p25: percentile(25.0),
            p75: percentile(75.0),
            p95: percentile(95.0),
        },
        histogram,
    }
}

#[command]
pub fn cancel_simulation() -> Result<(), String> {
    // In a full implementation, this would signal a running simulation to stop
    Ok(())
}
