use serde::{Deserialize, Serialize};
use super::{alerts::AlertEvent, metrics::{SystemHistoryPoint, SystemSnapshot}, process::ProcessSummary};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportPayload {
    pub exported_at_ms: i64,
    pub system_snapshot: SystemSnapshot,
    pub processes: Vec<ProcessSummary>,
    pub history: Vec<SystemHistoryPoint>,
    pub alerts: Vec<AlertEvent>,
}
