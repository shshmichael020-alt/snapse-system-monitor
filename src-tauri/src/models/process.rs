use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessSummary {
    pub pid: u32,
    pub ppid: Option<u32>,
    pub name: String,
    pub executable_path: Option<String>,
    pub command_line: Option<String>,
    pub cpu_usage: f32, // Percentage (0.0 to 100.0)
    pub memory_bytes: u64,
    pub memory_percent: f32,
    pub disk_read_bytes_sec: u64,
    pub disk_write_bytes_sec: u64,
    pub user: Option<String>,
    pub start_time: u64, // Unix timestamp in seconds
    pub status: String,
    pub thread_count: Option<u32>,
    pub is_elevated: Option<bool>,
    pub is_system: bool,
    pub window_title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessTreeNode {
    pub process: ProcessSummary,
    pub children: Vec<ProcessTreeNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessHistorySample {
    pub timestamp_ms: i64,
    pub cpu_usage: f32,
    pub memory_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessDetails {
    pub process: ProcessSummary,
    pub parent_name: Option<String>,
    pub history: Vec<ProcessHistorySample>,
    pub handles_count: Option<u32>,
    pub working_set_private_bytes: Option<u64>,
    pub virtual_size_bytes: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessActionRequest {
    pub pid: u32,
    pub start_time: u64,
    pub force: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessActionResult {
    pub success: bool,
    pub pid: u32,
    pub message: String,
}
