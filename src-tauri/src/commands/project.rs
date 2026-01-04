use crate::models::{Project, RecentProject};
use std::fs;

use tauri::command;

#[command]
pub fn create_project(name: String) -> Result<Project, String> {
    let now = chrono::Utc::now().to_rfc3339();

    Ok(Project {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        version: "1.0.0".to_string(),
        created: now.clone(),
        modified: now,
        generators: vec![],
        shared_assets: vec![],
        export_config: Default::default(),
    })
}

#[command]
pub fn open_project(path: String) -> Result<Project, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;

    let project: Project =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse project: {}", e))?;

    Ok(project)
}

#[command]
pub fn save_project(project: Project, path: String) -> Result<(), String> {
    let content = serde_json::to_string_pretty(&project)
        .map_err(|e| format!("Failed to serialize project: {}", e))?;

    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[command]
pub fn get_recent_projects() -> Result<Vec<RecentProject>, String> {
    // For now, return empty. In a full implementation, this would read from a config file
    Ok(vec![])
}
