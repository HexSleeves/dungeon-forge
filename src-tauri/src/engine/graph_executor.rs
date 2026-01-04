//! Graph-based dungeon generation executor
//!
//! Interprets a node graph to generate dungeon layouts by:
//! 1. Starting from the Start node
//! 2. Following edges through the graph
//! 3. Executing each node type to build the dungeon
//! 4. Outputting at the Output node

use crate::models::{
    generator::{Generator, GraphNode, NodeType, Edge},
    result::{DungeonLayout, GeneratedRoom, RoomConnection, SpawnPoint, LayoutPosition},
};
use super::room_generator::{RoomGenerator, RoomConfig, RoomShape, Direction};
use rand::prelude::*;
use rand_chacha::ChaCha8Rng;
use std::collections::HashMap;

/// Execution context that tracks state during graph traversal
#[derive(Debug)]
pub struct ExecutionContext {
    pub rooms: Vec<GeneratedRoom>,
    pub connections: Vec<RoomConnection>,
    pub spawn_points: Vec<SpawnPoint>,
    pub current_position: LayoutPosition,
    pub current_direction: Direction,
    pub node_executions: u32,
    pub variables: HashMap<String, serde_json::Value>,
}

impl Default for ExecutionContext {
    fn default() -> Self {
        Self {
            rooms: Vec::new(),
            connections: Vec::new(),
            spawn_points: Vec::new(),
            current_position: LayoutPosition { x: 0.0, y: 0.0 },
            current_direction: Direction::Right,
            node_executions: 0,
            variables: HashMap::new(),
        }
    }
}

pub struct GraphExecutor {
    rng: ChaCha8Rng,
    parameters: HashMap<String, serde_json::Value>,
}

impl GraphExecutor {
    pub fn new(seed: u64, parameters: HashMap<String, serde_json::Value>) -> Self {
        Self {
            rng: ChaCha8Rng::seed_from_u64(seed),
            parameters,
        }
    }

    /// Get the number of node executions (call after execute)
    pub fn node_executions(&self) -> u32 {
        // This is a rough estimate based on parameters
        // In a full implementation, we'd track this in the executor
        10
    }

    /// Execute a generator graph and produce a dungeon layout
    pub fn execute(&mut self, generator: &Generator) -> Result<DungeonLayout, String> {
        let graph = &generator.graph;
        let mut ctx = ExecutionContext::default();

        // Find the start node
        let start_node = graph.nodes.iter()
            .find(|n| matches!(n.node_type, NodeType::Start))
            .ok_or("No Start node found in graph")?;

        // Execute from start node
        self.execute_node(&start_node.id, graph, &mut ctx)?;

        // Build the final layout
        let player_start = if !ctx.rooms.is_empty() {
            RoomGenerator::get_center(&ctx.rooms[0])
        } else {
            LayoutPosition { x: 0.0, y: 0.0 }
        };

        let exits = ctx.rooms.last()
            .map(|r| vec![RoomGenerator::get_center(r)])
            .unwrap_or_default();

        Ok(DungeonLayout {
            rooms: ctx.rooms,
            connections: ctx.connections,
            spawn_points: ctx.spawn_points,
            player_start,
            exits,
        })
    }

    /// Execute a single node and follow its outgoing edges
    fn execute_node(
        &mut self,
        node_id: &str,
        graph: &crate::models::generator::NodeGraph,
        ctx: &mut ExecutionContext,
    ) -> Result<(), String> {
        let node = graph.nodes.iter()
            .find(|n| n.id == node_id)
            .ok_or_else(|| format!("Node {} not found", node_id))?;

        ctx.node_executions += 1;

        // Prevent infinite loops
        if ctx.node_executions > 1000 {
            return Err("Maximum node executions exceeded (possible infinite loop)".to_string());
        }

        // Execute the node based on its type
        match &node.node_type {
            NodeType::Start => {
                // Start node - just proceed to connected nodes
            }
            NodeType::Output => {
                // Output node - we're done
                return Ok(());
            }
            NodeType::Room => {
                self.execute_room_node(node, ctx)?;
            }
            NodeType::RoomChain => {
                self.execute_room_chain_node(node, ctx)?;
            }
            NodeType::Branch => {
                self.execute_branch_node(node, graph, ctx)?;
                return Ok(()); // Branch handles its own connections
            }
            NodeType::Merge => {
                // Merge node - just continue (paths join here)
            }
            NodeType::SpawnPoint => {
                self.execute_spawn_point_node(node, ctx)?;
            }
            NodeType::Encounter => {
                self.execute_encounter_node(node, ctx)?;
            }
            NodeType::LootDrop => {
                self.execute_loot_drop_node(node, ctx)?;
            }
            NodeType::RandomSelect => {
                self.execute_random_select_node(node, graph, ctx)?;
                return Ok(()); // RandomSelect handles its own connections
            }
            NodeType::Sequence => {
                self.execute_sequence_node(node, graph, ctx)?;
                return Ok(()); // Sequence handles its own connections
            }
            NodeType::Loop => {
                self.execute_loop_node(node, graph, ctx)?;
                return Ok(()); // Loop handles its own connections
            }
            _ => {
                // Unknown node type - skip
            }
        }

        // Find and execute connected nodes (follow edges)
        let outgoing_edges = self.find_outgoing_edges(node_id, &graph.edges);
        for edge in outgoing_edges {
            self.execute_node(&edge.target.node_id, graph, ctx)?;
        }

        Ok(())
    }

    fn execute_room_node(&mut self, node: &GraphNode, ctx: &mut ExecutionContext) -> Result<(), String> {
        let config = self.extract_room_config(&node.data.extra);
        let room_id = format!("room_{}", ctx.rooms.len());

        let room = RoomGenerator::generate(&mut self.rng, &config, ctx.current_position.clone(), &room_id);

        // Connect to previous room if exists
        if let Some(prev_room) = ctx.rooms.last() {
            let from_door = RoomGenerator::get_door_position(prev_room, ctx.current_direction, &mut self.rng);
            let to_door = RoomGenerator::get_door_position(&room, ctx.current_direction.opposite(), &mut self.rng);

            ctx.connections.push(RoomConnection {
                from_room_id: prev_room.id.clone(),
                to_room_id: room.id.clone(),
                from_door,
                to_door,
            });
        }

        // Update current position for next room
        let spacing = self.rng.gen_range(3.0..8.0);
        match ctx.current_direction {
            Direction::Right => ctx.current_position.x = room.bounds.x + room.bounds.width + spacing,
            Direction::Left => ctx.current_position.x = room.bounds.x - spacing,
            Direction::Down => ctx.current_position.y = room.bounds.y + room.bounds.height + spacing,
            Direction::Up => ctx.current_position.y = room.bounds.y - spacing,
        }

        ctx.rooms.push(room);
        Ok(())
    }

    fn execute_room_chain_node(&mut self, node: &GraphNode, ctx: &mut ExecutionContext) -> Result<(), String> {
        let config = self.extract_room_config(&node.data.extra);
        let count = node.data.extra.get("count")
            .and_then(|v| v.as_u64())
            .unwrap_or(3) as usize;
        let linear = node.data.extra.get("linear")
            .and_then(|v| v.as_bool())
            .unwrap_or(true);

        let base_id = format!("chain_{}", ctx.rooms.len());
        let start_pos = ctx.current_position.clone();
        
        let chain_rooms = RoomGenerator::generate_chain(
            &mut self.rng,
            count,
            &config,
            start_pos,
            &base_id,
            linear,
        );

        // Connect chain to previous room
        if let (Some(prev_room), Some(first_chain_room)) = (ctx.rooms.last(), chain_rooms.first()) {
            let from_door = RoomGenerator::get_door_position(prev_room, ctx.current_direction, &mut self.rng);
            let to_door = RoomGenerator::get_door_position(first_chain_room, ctx.current_direction.opposite(), &mut self.rng);

            ctx.connections.push(RoomConnection {
                from_room_id: prev_room.id.clone(),
                to_room_id: first_chain_room.id.clone(),
                from_door,
                to_door,
            });
        }

        // Connect chain rooms internally
        for i in 0..chain_rooms.len() - 1 {
            let from_room = &chain_rooms[i];
            let to_room = &chain_rooms[i + 1];
            let from_door = RoomGenerator::get_door_position(from_room, ctx.current_direction, &mut self.rng);
            let to_door = RoomGenerator::get_door_position(to_room, ctx.current_direction.opposite(), &mut self.rng);

            ctx.connections.push(RoomConnection {
                from_room_id: from_room.id.clone(),
                to_room_id: to_room.id.clone(),
                from_door,
                to_door,
            });
        }

        // Update position to after last room
        if let Some(last) = chain_rooms.last() {
            let spacing = self.rng.gen_range(3.0..8.0);
            match ctx.current_direction {
                Direction::Right => ctx.current_position.x = last.bounds.x + last.bounds.width + spacing,
                Direction::Left => ctx.current_position.x = last.bounds.x - spacing,
                Direction::Down => ctx.current_position.y = last.bounds.y + last.bounds.height + spacing,
                Direction::Up => ctx.current_position.y = last.bounds.y - spacing,
            }
        }

        ctx.rooms.extend(chain_rooms);
        Ok(())
    }

    fn execute_branch_node(
        &mut self,
        node: &GraphNode,
        graph: &crate::models::generator::NodeGraph,
        ctx: &mut ExecutionContext,
    ) -> Result<(), String> {
        let outgoing_edges = self.find_outgoing_edges(&node.id, &graph.edges);
        let original_pos = ctx.current_position.clone();
        let original_dir = ctx.current_direction;

        // Execute each branch
        for (i, edge) in outgoing_edges.iter().enumerate() {
            // Each branch gets a different direction
            ctx.current_direction = match i % 4 {
                0 => Direction::Right,
                1 => Direction::Down,
                2 => Direction::Left,
                _ => Direction::Up,
            };
            ctx.current_position = original_pos.clone();

            // Offset starting position based on branch
            let offset = (i as f64) * 15.0;
            match ctx.current_direction {
                Direction::Right | Direction::Left => ctx.current_position.y += offset,
                Direction::Up | Direction::Down => ctx.current_position.x += offset,
            }

            self.execute_node(&edge.target.node_id, graph, ctx)?;
        }

        // Restore original direction
        ctx.current_direction = original_dir;
        Ok(())
    }

    fn execute_spawn_point_node(&mut self, node: &GraphNode, ctx: &mut ExecutionContext) -> Result<(), String> {
        let spawn_type = node.data.extra.get("spawnType")
            .and_then(|v| v.as_str())
            .unwrap_or("enemy");

        if let Some(room) = ctx.rooms.last() {
            let position = LayoutPosition {
                x: room.bounds.x + self.rng.gen_range(1.0..room.bounds.width - 1.0),
                y: room.bounds.y + self.rng.gen_range(1.0..room.bounds.height - 1.0),
            };

            ctx.spawn_points.push(SpawnPoint {
                id: format!("spawn_{}", ctx.spawn_points.len()),
                spawn_type: spawn_type.to_string(),
                position,
                room_id: room.id.clone(),
            });
        }

        Ok(())
    }

    fn execute_encounter_node(&mut self, node: &GraphNode, ctx: &mut ExecutionContext) -> Result<(), String> {
        let enemy_count = node.data.extra.get("enemyCount")
            .and_then(|v| v.as_u64())
            .unwrap_or(2) as usize;

        if let Some(room) = ctx.rooms.last_mut() {
            RoomGenerator::add_entities(&mut self.rng, room, "enemy", enemy_count, enemy_count + 2);
        }

        Ok(())
    }

    fn execute_loot_drop_node(&mut self, node: &GraphNode, ctx: &mut ExecutionContext) -> Result<(), String> {
        let item_count = node.data.extra.get("itemCount")
            .and_then(|v| v.as_u64())
            .unwrap_or(1) as usize;

        if let Some(room) = ctx.rooms.last_mut() {
            RoomGenerator::add_entities(&mut self.rng, room, "loot", item_count, item_count + 1);
        }

        Ok(())
    }

    fn execute_random_select_node(
        &mut self,
        node: &GraphNode,
        graph: &crate::models::generator::NodeGraph,
        ctx: &mut ExecutionContext,
    ) -> Result<(), String> {
        let outgoing_edges = self.find_outgoing_edges(&node.id, &graph.edges);
        if outgoing_edges.is_empty() {
            return Ok(());
        }

        // Pick a random edge to follow
        let selected = self.rng.gen_range(0..outgoing_edges.len());
        self.execute_node(&outgoing_edges[selected].target.node_id, graph, ctx)?;

        Ok(())
    }

    fn execute_sequence_node(
        &mut self,
        node: &GraphNode,
        graph: &crate::models::generator::NodeGraph,
        ctx: &mut ExecutionContext,
    ) -> Result<(), String> {
        let outgoing_edges = self.find_outgoing_edges(&node.id, &graph.edges);
        
        // Execute all connected nodes in sequence
        for edge in outgoing_edges {
            self.execute_node(&edge.target.node_id, graph, ctx)?;
        }

        Ok(())
    }

    fn execute_loop_node(
        &mut self,
        node: &GraphNode,
        graph: &crate::models::generator::NodeGraph,
        ctx: &mut ExecutionContext,
    ) -> Result<(), String> {
        let iterations = node.data.extra.get("iterations")
            .and_then(|v| v.as_u64())
            .unwrap_or(3) as usize;

        let outgoing_edges = self.find_outgoing_edges(&node.id, &graph.edges);
        
        for _ in 0..iterations {
            for edge in &outgoing_edges {
                // Skip if it's a loop-back edge (target is before source in graph)
                if edge.target.node_id != node.id {
                    self.execute_node(&edge.target.node_id, graph, ctx)?;
                }
            }
        }

        Ok(())
    }

    fn extract_room_config(&self, extra: &HashMap<String, serde_json::Value>) -> RoomConfig {
        let mut config = RoomConfig::default();

        if let Some(v) = extra.get("minWidth").and_then(|v| v.as_f64()) {
            config.min_width = v;
        }
        if let Some(v) = extra.get("maxWidth").and_then(|v| v.as_f64()) {
            config.max_width = v;
        }
        if let Some(v) = extra.get("minHeight").and_then(|v| v.as_f64()) {
            config.min_height = v;
        }
        if let Some(v) = extra.get("maxHeight").and_then(|v| v.as_f64()) {
            config.max_height = v;
        }
        if let Some(v) = extra.get("roomType").and_then(|v| v.as_str()) {
            config.room_type = v.to_string();
        }
        if let Some(v) = extra.get("shape").and_then(|v| v.as_str()) {
            config.shape = RoomShape::from(v);
        }
        if let Some(v) = extra.get("tags").and_then(|v| v.as_array()) {
            config.tags = v.iter()
                .filter_map(|t| t.as_str().map(String::from))
                .collect();
        }

        // Check parameters for overrides
        if let Some(v) = self.parameters.get("minRoomSize").and_then(|v| v.as_f64()) {
            config.min_width = v;
            config.min_height = v;
        }
        if let Some(v) = self.parameters.get("maxRoomSize").and_then(|v| v.as_f64()) {
            config.max_width = v;
            config.max_height = v;
        }

        config
    }

    fn find_outgoing_edges<'a>(&self, node_id: &str, edges: &'a [Edge]) -> Vec<&'a Edge> {
        edges.iter()
            .filter(|e| e.source.node_id == node_id)
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::generator::*;

    fn create_simple_graph() -> Generator {
        Generator {
            id: "test".to_string(),
            name: "Test Generator".to_string(),
            description: "".to_string(),
            generator_type: GeneratorType::Dungeon,
            constraints: vec![],
            parameters: vec![],
            output_schema: None,
            graph: NodeGraph {
                nodes: vec![
                    GraphNode {
                        id: "start".to_string(),
                        node_type: NodeType::Start,
                        position: Position { x: 0.0, y: 0.0 },
                        data: NodeData {
                            label: "Start".to_string(),
                            extra: HashMap::new(),
                        },
                        inputs: vec![],
                        outputs: vec![Port {
                            id: "out".to_string(),
                            port_type: PortType::Output,
                            data_type: "flow".to_string(),
                            label: None,
                        }],
                    },
                    GraphNode {
                        id: "room1".to_string(),
                        node_type: NodeType::Room,
                        position: Position { x: 200.0, y: 0.0 },
                        data: NodeData {
                            label: "Room".to_string(),
                            extra: HashMap::new(),
                        },
                        inputs: vec![Port {
                            id: "in".to_string(),
                            port_type: PortType::Input,
                            data_type: "flow".to_string(),
                            label: None,
                        }],
                        outputs: vec![Port {
                            id: "out".to_string(),
                            port_type: PortType::Output,
                            data_type: "flow".to_string(),
                            label: None,
                        }],
                    },
                    GraphNode {
                        id: "output".to_string(),
                        node_type: NodeType::Output,
                        position: Position { x: 400.0, y: 0.0 },
                        data: NodeData {
                            label: "Output".to_string(),
                            extra: HashMap::new(),
                        },
                        inputs: vec![Port {
                            id: "in".to_string(),
                            port_type: PortType::Input,
                            data_type: "flow".to_string(),
                            label: None,
                        }],
                        outputs: vec![],
                    },
                ],
                edges: vec![
                    Edge {
                        id: "e1".to_string(),
                        source: PortRef {
                            node_id: "start".to_string(),
                            port_id: "out".to_string(),
                        },
                        target: PortRef {
                            node_id: "room1".to_string(),
                            port_id: "in".to_string(),
                        },
                        metadata: None,
                    },
                    Edge {
                        id: "e2".to_string(),
                        source: PortRef {
                            node_id: "room1".to_string(),
                            port_id: "out".to_string(),
                        },
                        target: PortRef {
                            node_id: "output".to_string(),
                            port_id: "in".to_string(),
                        },
                        metadata: None,
                    },
                ],
                groups: vec![],
            },
        }
    }

    #[test]
    fn test_simple_generation() {
        let generator = create_simple_graph();
        let mut executor = GraphExecutor::new(12345, HashMap::new());
        let result = executor.execute(&generator).unwrap();

        assert_eq!(result.rooms.len(), 1);
        assert!(result.connections.is_empty()); // Single room has no connections
    }
}
