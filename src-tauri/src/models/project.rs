use super::generator::Generator;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub version: String,
    pub created: String,
    pub modified: String,
    pub generators: Vec<Generator>,
    #[serde(default)]
    pub shared_assets: Vec<Asset>,
    pub export_config: ExportConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Asset {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub asset_type: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportConfig {
    pub default_target: ExportTarget,
    pub output_dir: String,
    #[serde(default)]
    pub include_runtime: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportTarget {
    Json,
    Typescript,
    Rust,
    Csharp,
    Gdscript,
}

impl Default for ExportConfig {
    fn default() -> Self {
        Self {
            default_target: ExportTarget::Typescript,
            output_dir: "./generated".to_string(),
            include_runtime: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentProject {
    pub id: String,
    pub name: String,
    pub path: String,
    pub last_opened: String,
}
