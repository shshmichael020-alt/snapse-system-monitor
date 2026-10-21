use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuCoreUsage {
    pub core_id: usize,
    pub frequency_mhz: u64,
    pub usage_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuSnapshot {
    pub total_usage_percent: f32,
    pub cores: Vec<CpuCoreUsage>,
    pub brand: String,
    pub vendor_id: String,
    pub physical_cores: usize,
    pub logical_cores: usize,
    pub base_frequency_mhz: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemorySnapshot {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub free_bytes: u64,
    pub available_bytes: u64,
    pub used_percent: f32,
    pub swap_total_bytes: u64,
    pub swap_used_bytes: u64,
    pub swap_free_bytes: u64,
    pub swap_used_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskVolumeInfo {
    pub name: String,
    pub mount_point: String,
    pub file_system: String,
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub used_bytes: u64,
    pub used_percent: f32,
    pub is_removable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageSnapshot {
    pub volumes: Vec<DiskVolumeInfo>,
    pub read_bytes_sec: u64,
    pub write_bytes_sec: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInterfaceSnapshot {
    pub name: String,
    pub rx_bytes_sec: u64,
    pub tx_bytes_sec: u64,
    pub total_rx_bytes: u64,
    pub total_tx_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkSnapshot {
    pub interfaces: Vec<NetworkInterfaceSnapshot>,
    pub total_rx_bytes_sec: u64,
    pub total_tx_bytes_sec: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostSystemInfo {
    pub os_name: String,
    pub os_version: String,
    pub kernel_version: String,
    pub host_name: String,
    pub uptime_seconds: u64,
    pub boot_time: u64,
    pub snapse_pid: u32,
    pub snapse_cpu_percent: f32,
    pub snapse_memory_bytes: u64,
    pub is_admin: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemSnapshot {
    pub timestamp_ms: i64,
    pub cpu: CpuSnapshot,
    pub memory: MemorySnapshot,
    pub storage: StorageSnapshot,
    pub network: NetworkSnapshot,
    pub system: HostSystemInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemHistoryPoint {
    pub timestamp_ms: i64,
    pub cpu_usage: f32,
    pub memory_used_bytes: u64,
    pub memory_percent: f32,
    pub disk_read_bytes_sec: u64,
    pub disk_write_bytes_sec: u64,
    pub net_rx_bytes_sec: u64,
    pub net_tx_bytes_sec: u64,
}
