export interface CpuCoreUsage {
  core_id: number;
  frequency_mhz: number;
  usage_percent: number;
}

export interface CpuSnapshot {
  total_usage_percent: number;
  cores: CpuCoreUsage[];
  brand: string;
  vendor_id: string;
  physical_cores: number;
  logical_cores: number;
  base_frequency_mhz: number;
  virtualization_enabled: boolean;
  virtualization_type: string;
}

export interface MemorySnapshot {
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  available_bytes: number;
  used_percent: number;
  swap_total_bytes: number;
  swap_used_bytes: number;
  swap_free_bytes: number;
  swap_used_percent: number;
}

export interface DiskVolumeInfo {
  name: string;
  mount_point: string;
  file_system: string;
  total_bytes: number;
  available_bytes: number;
  used_bytes: number;
  used_percent: number;
  is_removable: boolean;
}

export interface StorageSnapshot {
  volumes: DiskVolumeInfo[];
  physical_disk_model: string;
  physical_disk_size_bytes: number;
  read_bytes_sec: number;
  write_bytes_sec: number;
}

export interface NetworkInterfaceSnapshot {
  name: string;
  display_name: string;
  adapter_type: string;
  is_connected: boolean;
  rx_bytes_sec: number;
  tx_bytes_sec: number;
  total_rx_bytes: number;
  total_tx_bytes: number;
}

export interface NetworkSnapshot {
  interfaces: NetworkInterfaceSnapshot[];
  total_rx_bytes_sec: number;
  total_tx_bytes_sec: number;
}

export interface GpuSnapshot {
  name: string;
  vendor_name: string;
  driver_version: string;
  dedicated_memory_bytes: number;
  shared_memory_bytes: number;
  utilization_percent: number;
  temperature_celsius?: number | null;
  power_watts?: number | null;
}

export interface HostSystemInfo {
  os_name: string;
  os_version: string;
  kernel_version: string;
  host_name: string;
  uptime_seconds: number;
  boot_time: number;
  snapse_pid: number;
  snapse_cpu_percent: number;
  snapse_memory_bytes: number;
  is_admin: boolean;
}

export interface SystemSnapshot {
  timestamp_ms: number;
  cpu: CpuSnapshot;
  memory: MemorySnapshot;
  storage: StorageSnapshot;
  network: NetworkSnapshot;
  gpu?: GpuSnapshot | null;
  system: HostSystemInfo;
}

export interface ProcessSummary {
  pid: number;
  ppid?: number | null;
  name: string;
  executable_path?: string | null;
  command_line?: string | null;
  cpu_usage: number; // 0.0 - 100.0 %
  memory_bytes: number;
  memory_percent: number;
  disk_read_bytes_sec: number;
  disk_write_bytes_sec: number;
  user?: string | null;
  start_time: number;
  status: string;
  thread_count?: number | null;
  is_elevated?: boolean | null;
  is_system: boolean;
  window_title?: string | null;
}

export interface ProcessTreeNode {
  process: ProcessSummary;
  children: ProcessTreeNode[];
}

export interface ProcessHistorySample {
  timestamp_ms: number;
  cpu_usage: number;
  memory_bytes: number;
}

export interface ProcessDetails {
  process: ProcessSummary;
  parent_name?: string | null;
  history: ProcessHistorySample[];
  handles_count?: number | null;
  working_set_private_bytes?: number | null;
  virtual_size_bytes?: number | null;
}

export interface ProcessActionResult {
  success: boolean;
  pid: number;
  message: string;
}

export interface SystemHistoryPoint {
  timestamp_ms: number;
  cpu_usage: number;
  memory_used_bytes: number;
  memory_percent: number;
  disk_read_bytes_sec: number;
  disk_write_bytes_sec: number;
  net_rx_bytes_sec: number;
  net_tx_bytes_sec: number;
  gpu_utilization?: number | null;
}

export type AlertSeverity = 'Info' | 'Warning' | 'Critical';

export interface AlertEvent {
  id: string;
  timestamp_ms: number;
  metric: string;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  duration_seconds: number;
  acknowledged: boolean;
}

export interface AppSettings {
  refresh_interval_ms: number;
  history_window_seconds: number;
  theme: string;
  alert_cpu_threshold: number;
  alert_cpu_duration_seconds: number;
  alert_memory_threshold: number;
  alert_memory_duration_seconds: number;
  adaptive_monitoring_enabled: boolean;
  enable_3d_view: boolean;
  visible_columns: string[];
}
