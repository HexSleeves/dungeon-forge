mod commands;
mod models;

use commands::{
    cancel_simulation, create_project, generate_once, get_recent_projects, open_project,
    run_simulation, save_project,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            create_project,
            open_project,
            save_project,
            get_recent_projects,
            generate_once,
            run_simulation,
            cancel_simulation,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
