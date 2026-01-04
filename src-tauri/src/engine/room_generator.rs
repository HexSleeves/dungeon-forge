//! Room generation utilities

use crate::models::{GeneratedRoom, LayoutPosition, PlacedEntity, Rectangle};
use rand::prelude::*;
use rand_chacha::ChaCha8Rng;
use std::collections::HashMap;

/// Configuration for generating a room
#[derive(Debug, Clone)]
pub struct RoomConfig {
    pub min_width: f64,
    pub max_width: f64,
    pub min_height: f64,
    pub max_height: f64,
    pub shape: RoomShape,
    pub room_type: String,
    pub tags: Vec<String>,
}

impl Default for RoomConfig {
    fn default() -> Self {
        Self {
            min_width: 5.0,
            max_width: 10.0,
            min_height: 5.0,
            max_height: 10.0,
            shape: RoomShape::Rectangular,
            room_type: "default".to_string(),
            tags: vec![],
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum RoomShape {
    Rectangular,
    LShaped,
    Circular,
    Irregular,
}

impl From<&str> for RoomShape {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "l-shaped" | "lshaped" => RoomShape::LShaped,
            "circular" | "circle" => RoomShape::Circular,
            "irregular" => RoomShape::Irregular,
            _ => RoomShape::Rectangular,
        }
    }
}

pub struct RoomGenerator;

impl RoomGenerator {
    /// Generate a room with the given configuration at a position
    pub fn generate(
        rng: &mut ChaCha8Rng,
        config: &RoomConfig,
        base_position: LayoutPosition,
        room_id: &str,
    ) -> GeneratedRoom {
        let width = rng.gen_range(config.min_width..=config.max_width);
        let height = rng.gen_range(config.min_height..=config.max_height);

        let bounds = Rectangle {
            x: base_position.x,
            y: base_position.y,
            width,
            height,
        };

        let mut metadata = HashMap::new();
        metadata.insert(
            "shape".to_string(),
            serde_json::Value::String(format!("{:?}", config.shape)),
        );
        if !config.tags.is_empty() {
            metadata.insert(
                "tags".to_string(),
                serde_json::Value::Array(
                    config
                        .tags
                        .iter()
                        .map(|t| serde_json::Value::String(t.clone()))
                        .collect(),
                ),
            );
        }

        GeneratedRoom {
            id: room_id.to_string(),
            room_type: config.room_type.clone(),
            bounds,
            tiles: None,
            entities: vec![],
            metadata,
        }
    }

    /// Generate a chain of connected rooms
    pub fn generate_chain(
        rng: &mut ChaCha8Rng,
        count: usize,
        room_config: &RoomConfig,
        start_position: LayoutPosition,
        base_id: &str,
        linear: bool,
    ) -> Vec<GeneratedRoom> {
        let mut rooms = Vec::with_capacity(count);
        let mut current_pos = start_position;

        for i in 0..count {
            let room_id = format!("{}_{}", base_id, i);
            let room = Self::generate(rng, room_config, current_pos.clone(), &room_id);

            // Calculate next position
            if linear || rng.gen_bool(0.7) {
                // Move right
                current_pos.x += room.bounds.width + rng.gen_range(3.0..8.0);
            } else {
                // Move down
                current_pos.y += room.bounds.height + rng.gen_range(3.0..8.0);
            }

            // Add some variation
            if !linear {
                current_pos.x += rng.gen_range(-2.0..2.0);
                current_pos.y += rng.gen_range(-2.0..2.0);
            }

            rooms.push(room);
        }

        rooms
    }

    /// Add entities to a room (enemies, items, etc.)
    pub fn add_entities(
        rng: &mut ChaCha8Rng,
        room: &mut GeneratedRoom,
        entity_type: &str,
        min_count: usize,
        max_count: usize,
    ) {
        let count = rng.gen_range(min_count..=max_count);
        let padding = 1.5; // Keep entities away from walls

        for i in 0..count {
            let x = room.bounds.x + rng.gen_range(padding..(room.bounds.width - padding));
            let y = room.bounds.y + rng.gen_range(padding..(room.bounds.height - padding));

            room.entities.push(PlacedEntity {
                id: format!("{}_{}_entity_{}", room.id, entity_type, i),
                entity_type: entity_type.to_string(),
                position: LayoutPosition { x, y },
                metadata: HashMap::new(),
            });
        }
    }

    /// Get center position of a room
    pub fn get_center(room: &GeneratedRoom) -> LayoutPosition {
        LayoutPosition {
            x: room.bounds.x + room.bounds.width / 2.0,
            y: room.bounds.y + room.bounds.height / 2.0,
        }
    }

    /// Get a door position on the edge of a room facing a direction
    pub fn get_door_position(
        room: &GeneratedRoom,
        direction: Direction,
        rng: &mut ChaCha8Rng,
    ) -> LayoutPosition {
        match direction {
            Direction::Right => LayoutPosition {
                x: room.bounds.x + room.bounds.width,
                y: room.bounds.y
                    + rng.gen_range(room.bounds.height * 0.25..room.bounds.height * 0.75),
            },
            Direction::Left => LayoutPosition {
                x: room.bounds.x,
                y: room.bounds.y
                    + rng.gen_range(room.bounds.height * 0.25..room.bounds.height * 0.75),
            },
            Direction::Down => LayoutPosition {
                x: room.bounds.x
                    + rng.gen_range(room.bounds.width * 0.25..room.bounds.width * 0.75),
                y: room.bounds.y + room.bounds.height,
            },
            Direction::Up => LayoutPosition {
                x: room.bounds.x
                    + rng.gen_range(room.bounds.width * 0.25..room.bounds.width * 0.75),
                y: room.bounds.y,
            },
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub enum Direction {
    Right,
    Left,
    Up,
    Down,
}

impl Direction {
    pub fn opposite(&self) -> Self {
        match self {
            Direction::Right => Direction::Left,
            Direction::Left => Direction::Right,
            Direction::Up => Direction::Down,
            Direction::Down => Direction::Up,
        }
    }
}
