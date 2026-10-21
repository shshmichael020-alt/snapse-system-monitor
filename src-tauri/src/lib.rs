pub mod alerts;
pub mod commands;
pub mod history;
pub mod models;
pub mod monitoring;
pub mod platform;
pub mod settings;

#[cfg(test)]
pub mod tests;

use std::sync::Arc;
use parking_lot::RwLock;
use monitoring::MonitoringEngine;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let engine = Arc::new(RwLock::new(MonitoringEngine::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(engine)
        .setup(|app| {
            if let Some(icon) = app.default_window_icon() {
                for (_label, window) in app.webview_windows() {
                    let _ = window.set_icon(icon.clone());
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_system_snapshot,
            commands::get_processes,
            commands::get_process_tree,
            commands::get_process_details,
            commands::terminate_process,
            commands::request_process_close,
            commands::window_minimize,
            commands::window_toggle_maximize,
            commands::window_close,
            commands::open_process_location,
            commands::create_process_dump,
            commands::get_system_history,
            commands::get_process_history,
            commands::get_alerts,
            commands::acknowledge_alert,
            commands::get_settings,
            commands::save_settings,
            commands::export_snapshot,
            commands::configure_research_sampling,
            commands::start_research_recording,
            commands::stop_research_recording,
            commands::get_research_telemetry,
            commands::step_research_sample,
            commands::export_research_telemetry_csv
        ])
        .run(tauri::generate_context!())
        .expect("error while running Snapse Tauri application");
}
