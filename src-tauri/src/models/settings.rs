use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub refresh_interval_ms: u64,
    pub history_window_seconds: u64,
    pub theme: String, // "dark", "light", "system"
    pub alert_cpu_threshold: f32, // e.g. 85.0 %
    pub alert_cpu_duration_seconds: u64, // e.g. 5 seconds
    pub alert_memory_threshold: f32, // e.g. 90.0 %
    pub alert_memory_duration_seconds: u64,
    pub adaptive_monitoring_enabled: bool,
    pub enable_3d_view: bool,
    pub visible_columns: Vec<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            refresh_interval_ms: 1000,
            history_window_seconds: 60,
            theme: "dark".to_string(),
            alert_cpu_threshold: 85.0,
            alert_cpu_duration_seconds: 5,
            alert_memory_threshold: 90.0,
            alert_memory_duration_seconds: 5,
            adaptive_monitoring_enabled: false,
            enable_3d_view: true,
            visible_columns: vec![
                "name".to_string(),
                "pid".to_string(),
                "status".to_string(),
                "cpu".to_string(),
                "memory".to_string(),
                "disk".to_string(),
                "network".to_string(),
                "user".to_string(),
            ],
        }
    }
}
