use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationRequest {
    #[serde(rename = "generatorId")]
    pub generator_id: String,
    pub seed: u64,
    #[serde(default)]
    pub parameters: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationResult {
    pub seed: u64,
    pub timestamp: u64,
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<DungeonLayout>,
    #[serde(default, rename = "constraintResults")]
    pub constraint_results: Vec<ConstraintResult>,
    pub metadata: GenerationMetadata,
    #[serde(default)]
    pub errors: Vec<String>,
    #[serde(rename = "durationMs")]
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DungeonLayout {
    pub rooms: Vec<GeneratedRoom>,
    pub connections: Vec<RoomConnection>,
    #[serde(default, rename = "spawnPoints")]
    pub spawn_points: Vec<SpawnPoint>,
    #[serde(rename = "playerStart")]
    pub player_start: LayoutPosition,
    pub exits: Vec<LayoutPosition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedRoom {
    pub id: String,
    #[serde(rename = "type")]
    pub room_type: String,
    pub bounds: Rectangle,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tiles: Option<Vec<Vec<i32>>>,
    #[serde(default)]
    pub entities: Vec<PlacedEntity>,
    #[serde(default)]
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rectangle {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutPosition {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlacedEntity {
    pub id: String,
    #[serde(rename = "type")]
    pub entity_type: String,
    pub position: LayoutPosition,
    #[serde(default)]
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomConnection {
    #[serde(rename = "fromRoomId")]
    pub from_room_id: String,
    #[serde(rename = "toRoomId")]
    pub to_room_id: String,
    #[serde(rename = "fromDoor")]
    pub from_door: LayoutPosition,
    #[serde(rename = "toDoor")]
    pub to_door: LayoutPosition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawnPoint {
    pub id: String,
    #[serde(rename = "type")]
    pub spawn_type: String,
    pub position: LayoutPosition,
    #[serde(rename = "roomId")]
    pub room_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConstraintResult {
    #[serde(rename = "constraintId")]
    pub constraint_id: String,
    pub passed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationMetadata {
    #[serde(rename = "nodeExecutions")]
    pub node_executions: u32,
    #[serde(rename = "retryCount")]
    pub retry_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationConfig {
    #[serde(rename = "generatorId")]
    pub generator_id: String,
    #[serde(rename = "runCount")]
    pub run_count: u32,
    #[serde(skip_serializing_if = "Option::is_none", rename = "seedStart")]
    pub seed_start: Option<u64>,
    #[serde(default)]
    pub parameters: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationResults {
    pub config: SimulationConfig,
    pub runs: u32,
    #[serde(rename = "successRate")]
    pub success_rate: f64,
    #[serde(rename = "durationMs")]
    pub duration_ms: u64,
    pub statistics: SimulationStatistics,
    #[serde(rename = "constraintResults")]
    pub constraint_results: HashMap<String, ConstraintStats>,
    #[serde(default)]
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationStatistics {
    #[serde(rename = "roomCount")]
    pub room_count: DistributionStats,
    #[serde(rename = "pathLength")]
    pub path_length: DistributionStats,
    #[serde(rename = "enemyCount")]
    pub enemy_count: DistributionStats,
    #[serde(rename = "itemCount")]
    pub item_count: DistributionStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistributionStats {
    pub min: f64,
    pub max: f64,
    pub mean: f64,
    pub median: f64,
    #[serde(rename = "stdDev")]
    pub std_dev: f64,
    pub percentiles: Percentiles,
    pub histogram: Vec<HistogramBucket>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Percentiles {
    pub p5: f64,
    pub p25: f64,
    pub p75: f64,
    pub p95: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistogramBucket {
    pub bucket: f64,
    pub count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConstraintStats {
    #[serde(rename = "passRate")]
    pub pass_rate: f64,
    pub violations: u32,
}
