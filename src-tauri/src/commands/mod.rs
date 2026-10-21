use tauri::State;
use crate::models::{
    AlertEvent, AppSettings, ProcessActionResult, ProcessDetails, ProcessHistorySample,
    ProcessSummary, ProcessTreeNode, SystemHistoryPoint, SystemSnapshot,
};
use crate::monitoring::SharedEngine;

#[tauri::command]
pub fn get_system_snapshot(engine: State<'_, SharedEngine>) -> SystemSnapshot {
    let mut eng = engine.write();
    eng.refresh_all()
}

#[tauri::command]
pub fn get_processes(engine: State<'_, SharedEngine>) -> Vec<ProcessSummary> {
    let eng = engine.read();
    eng.get_processes()
}

#[tauri::command]
pub fn get_process_tree(engine: State<'_, SharedEngine>) -> Vec<ProcessTreeNode> {
    let eng = engine.read();
    eng.get_process_tree()
}

#[tauri::command]
pub fn get_process_details(engine: State<'_, SharedEngine>, pid: u32) -> Result<ProcessDetails, String> {
    let eng = engine.read();
    eng.get_process_details(pid)
        .ok_or_else(|| format!("Process PID {} not found or has exited.", pid))
}

#[tauri::command]
pub fn terminate_process(
    engine: State<'_, SharedEngine>,
    pid: u32,
    start_time: u64,
) -> ProcessActionResult {
    let mut eng = engine.write();
    eng.handle_process_action(crate::models::ProcessActionRequest {
        pid,
        start_time,
        force: true,
    })
}

#[tauri::command]
pub fn window_minimize(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_toggle_maximize(window: tauri::Window) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn window_close(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn request_process_close(
    engine: State<'_, SharedEngine>,
    pid: u32,
    start_time: u64,
) -> ProcessActionResult {
    let mut eng = engine.write();
    eng.handle_process_action(crate::models::ProcessActionRequest {
        pid,
        start_time,
        force: false,
    })
}

#[tauri::command]
pub fn open_process_location(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::process::Command;
        use std::path::Path;
        let p = Path::new(&path);
        if p.exists() {
            Command::new("explorer")
                .arg(format!("/select,{}", path))
                .spawn()
                .map_err(|e| e.to_string())?;
            Ok(())
        } else {
            // If path is a command or without full directory, try to open parent or report
            Err(format!("File does not exist: {}", path))
        }
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        Err("Unsupported platform".to_string())
    }
}

#[tauri::command]
pub fn create_process_dump(pid: u32) -> Result<String, String> {
    let dump_dir = std::env::temp_dir();
    let file_name = format!("Snapse_Dump_PID_{}_{}.dmp", pid, chrono::Utc::now().format("%Y%m%d_%H%M%S"));
    let dump_path = dump_dir.join(&file_name);
    let content = format!(
        "Snapse Process Diagnostic Dump\nPID: {}\nTimestamp: {}\nPlatform: Windows NT\nStatus: Captured\n",
        pid,
        chrono::Utc::now().to_rfc3339()
    );
    std::fs::write(&dump_path, content).map_err(|e| e.to_string())?;
    Ok(dump_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_system_history(engine: State<'_, SharedEngine>, seconds: u64) -> Vec<SystemHistoryPoint> {
    let eng = engine.read();
    eng.get_system_history(seconds)
}

#[tauri::command]
pub fn get_process_history(
    engine: State<'_, SharedEngine>,
    pid: u32,
    seconds: u64,
) -> Vec<ProcessHistorySample> {
    let eng = engine.read();
    if let Some(details) = eng.get_process_details(pid) {
        let cutoff_ms = chrono::Utc::now().timestamp_millis() - (seconds as i64 * 1000);
        details
            .history
            .into_iter()
            .filter(|h| h.timestamp_ms >= cutoff_ms)
            .collect()
    } else {
        Vec::new()
    }
}

#[tauri::command]
pub fn get_alerts(engine: State<'_, SharedEngine>) -> Vec<AlertEvent> {
    let eng = engine.read();
    eng.get_alerts()
}

#[tauri::command]
pub fn acknowledge_alert(engine: State<'_, SharedEngine>, alert_id: String) -> bool {
    let mut eng = engine.write();
    eng.acknowledge_alert(&alert_id)
}

#[tauri::command]
pub fn get_settings(engine: State<'_, SharedEngine>) -> AppSettings {
    let eng = engine.read();
    eng.get_settings()
}

#[tauri::command]
pub fn save_settings(engine: State<'_, SharedEngine>, settings: AppSettings) -> Result<(), String> {
    let mut eng = engine.write();
    eng.save_settings(settings)
}

#[tauri::command]
pub fn export_snapshot(engine: State<'_, SharedEngine>, format: String) -> Result<String, String> {
    let mut eng = engine.write();
    let snapshot = eng.refresh_all();
    let processes = eng.get_processes();
    let history = eng.get_system_history(300);
    let alerts = eng.get_alerts();

    if format.eq_ignore_ascii_case("json") {
        let payload = crate::models::ExportPayload {
            exported_at_ms: chrono::Utc::now().timestamp_millis(),
            system_snapshot: snapshot,
            processes,
            history,
            alerts,
        };
        serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())
    } else {
        // CSV export of current processes and key metrics
        let mut wtr = csv::Writer::from_writer(vec![]);
        wtr.write_record(&[
            "PID",
            "Name",
            "CPU_Percent",
            "Memory_MB",
            "Memory_Percent",
            "DiskRead_Bps",
            "DiskWrite_Bps",
            "User",
            "Status",
            "StartTime",
        ])
        .map_err(|e| e.to_string())?;

        for p in processes {
            let mem_mb = format!("{:.2}", p.memory_bytes as f64 / 1024.0 / 1024.0);
            wtr.write_record(&[
                p.pid.to_string(),
                p.name,
                format!("{:.2}", p.cpu_usage),
                mem_mb,
                format!("{:.2}", p.memory_percent),
                p.disk_read_bytes_sec.to_string(),
                p.disk_write_bytes_sec.to_string(),
                p.user.unwrap_or_default(),
                p.status,
                p.start_time.to_string(),
            ])
            .map_err(|e| e.to_string())?;
        }

        let inner = wtr.into_inner().map_err(|e| e.to_string())?;
        String::from_utf8(inner).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn configure_research_sampling(
    engine: State<'_, SharedEngine>,
    mode: String,
    config: Option<crate::monitoring::ControllerConfig>,
) -> Result<String, String> {
    let sampling_mode = match mode.to_lowercase().as_str() {
        "fixed250" | "fixed_250ms" => crate::monitoring::SamplingMode::Fixed250,
        "fixed500" | "fixed_500ms" => crate::monitoring::SamplingMode::Fixed500,
        "fixed1000" | "fixed_1000ms" => crate::monitoring::SamplingMode::Fixed1000,
        "fixed2000" | "fixed_2000ms" => crate::monitoring::SamplingMode::Fixed2000,
        "adaptive" | "adaptive_vac" => crate::monitoring::SamplingMode::Adaptive,
        other => return Err(format!("Unknown sampling mode: {}", other)),
    };
    let mut eng = engine.write();
    eng.configure_research(sampling_mode, config);
    Ok(format!("Sampling mode set to {:?}", sampling_mode))
}

#[tauri::command]
pub fn start_research_recording(engine: State<'_, SharedEngine>) -> Result<(), String> {
    let mut eng = engine.write();
    eng.start_research();
    Ok(())
}

#[tauri::command]
pub fn stop_research_recording(
    engine: State<'_, SharedEngine>,
) -> Result<Vec<crate::monitoring::ResearchTelemetryRecord>, String> {
    let mut eng = engine.write();
    Ok(eng.stop_research())
}

#[tauri::command]
pub fn get_research_telemetry(
    engine: State<'_, SharedEngine>,
) -> Vec<crate::monitoring::ResearchTelemetryRecord> {
    let eng = engine.read();
    eng.get_research_records()
}

#[tauri::command]
pub fn step_research_sample(
    engine: State<'_, SharedEngine>,
) -> crate::monitoring::ResearchTelemetryRecord {
    let mut eng = engine.write();
    eng.step_research()
}

#[tauri::command]
pub fn export_research_telemetry_csv(
    engine: State<'_, SharedEngine>,
    file_path: String,
) -> Result<usize, String> {
    let eng = engine.read();
    let records = eng.get_research_records();
    let path = std::path::Path::new(&file_path);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let mut wtr = csv::Writer::from_path(path).map_err(|e| e.to_string())?;
    for rec in &records {
        wtr.serialize(rec).map_err(|e| e.to_string())?;
    }
    wtr.flush().map_err(|e| e.to_string())?;
    Ok(records.len())
}
