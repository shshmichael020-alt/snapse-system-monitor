use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AlertSeverity {
    Info,
    Warning,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertEvent {
    pub id: String,
    pub timestamp_ms: i64,
    pub metric: String, // "CPU" or "Memory" or "Process"
    pub severity: AlertSeverity,
    pub message: String,
    pub value: f32,
    pub threshold: f32,
    pub duration_seconds: u64,
    pub acknowledged: bool,
}
