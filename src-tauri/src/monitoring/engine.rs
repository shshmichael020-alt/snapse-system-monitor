use std::sync::Arc;
use std::time::Instant;
use parking_lot::RwLock;
use sysinfo::{
    CpuRefreshKind, Disks, MemoryRefreshKind, Networks, Pid, ProcessRefreshKind,
    ProcessesToUpdate, RefreshKind, System,
};

use crate::monitoring::sampler::{
    ControllerConfig, ResearchTelemetryRecord, SamplingMode, VolatilityController,
};
use crate::alerts::AlertEvaluator;
use crate::history::HistoryManager;
use crate::models::{
    CpuCoreUsage, CpuSnapshot, DiskVolumeInfo, HostSystemInfo, MemorySnapshot,
    NetworkInterfaceSnapshot, NetworkSnapshot, ProcessActionRequest, ProcessActionResult,
    ProcessDetails, ProcessHistorySample, ProcessSummary, ProcessTreeNode, StorageSnapshot,
    SystemHistoryPoint, SystemSnapshot,
};
use crate::platform::PlatformOps;
use crate::settings::SettingsManager;

pub struct MonitoringEngine {
    system: System,
    disks: Disks,
    networks: Networks,
    history: HistoryManager,
    alerts: AlertEvaluator,
    settings: SettingsManager,
    snapse_pid: u32,
    last_refresh_time: Instant,
    last_snapshot: Option<SystemSnapshot>,
    sampling_mode: SamplingMode,
    volatility_controller: VolatilityController,
    research_records: Vec<ResearchTelemetryRecord>,
    is_research_active: bool,
    last_sample_instant: Instant,
    target_interval_ms: u64,
}

pub type SharedEngine = Arc<RwLock<MonitoringEngine>>;

impl MonitoringEngine {
    pub fn new() -> Self {
        let snapse_pid = std::process::id();
        let mut system = System::new_with_specifics(
            RefreshKind::nothing()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything())
                .with_processes(ProcessRefreshKind::everything()),
        );
        system.refresh_all();

        let disks = Disks::new_with_refreshed_list();
        let networks = Networks::new_with_refreshed_list();

        Self {
            system,
            disks,
            networks,
            history: HistoryManager::new(3600, 300),
            alerts: AlertEvaluator::new(200),
            settings: SettingsManager::new(),
            snapse_pid,
            last_refresh_time: Instant::now(),
            last_snapshot: None,
            sampling_mode: SamplingMode::Adaptive,
            volatility_controller: VolatilityController::new(ControllerConfig::default()),
            research_records: Vec::with_capacity(5000),
            is_research_active: false,
            last_sample_instant: Instant::now(),
            target_interval_ms: 1000,
        }
    }

    pub fn refresh_all(&mut self) -> SystemSnapshot {
        let now = Instant::now();
        let elapsed_secs = (now - self.last_refresh_time).as_secs_f64().max(0.1);
        self.last_refresh_time = now;
        let timestamp_ms = chrono::Utc::now().timestamp_millis();

        // Refresh system metrics
        self.system.refresh_cpu_all();
        self.system.refresh_memory();
        self.system.refresh_processes(ProcessesToUpdate::All, true);
        self.disks.refresh(true);
        self.networks.refresh(true);

        // 1. CPU Snapshot
        let cpus = self.system.cpus();
        let logical_cores = cpus.len();
        let total_cpu_usage = self.system.global_cpu_usage();

        let mut cores = Vec::with_capacity(logical_cores);
        let mut brand = String::new();
        let mut vendor_id = String::new();
        let mut max_freq = 0u64;

        for (idx, cpu) in cpus.iter().enumerate() {
            if brand.is_empty() {
                brand = cpu.brand().trim().to_string();
            }
            if vendor_id.is_empty() {
                vendor_id = cpu.vendor_id().trim().to_string();
            }
            let freq = cpu.frequency();
            if freq > max_freq {
                max_freq = freq;
            }
            cores.push(CpuCoreUsage {
                core_id: idx,
                frequency_mhz: freq,
                usage_percent: cpu.cpu_usage(),
            });
        }

        let physical_cores = self.system.physical_core_count().unwrap_or(logical_cores);

        let cpu_snapshot = CpuSnapshot {
            total_usage_percent: total_cpu_usage,
            cores,
            brand: if brand.is_empty() { "Processor".to_string() } else { brand },
            vendor_id,
            physical_cores,
            logical_cores,
            base_frequency_mhz: max_freq,
        };

        // 2. Memory Snapshot
        let total_bytes = self.system.total_memory();
        let used_bytes = self.system.used_memory();
        let free_bytes = self.system.free_memory();
        let available_bytes = self.system.available_memory();
        let used_percent = if total_bytes > 0 {
            (used_bytes as f64 / total_bytes as f64 * 100.0) as f32
        } else {
            0.0
        };

        let swap_total_bytes = self.system.total_swap();
        let swap_used_bytes = self.system.used_swap();
        let swap_free_bytes = self.system.free_swap();
        let swap_used_percent = if swap_total_bytes > 0 {
            (swap_used_bytes as f64 / swap_total_bytes as f64 * 100.0) as f32
        } else {
            0.0
        };

        let memory_snapshot = MemorySnapshot {
            total_bytes,
            used_bytes,
            free_bytes,
            available_bytes,
            used_percent,
            swap_total_bytes,
            swap_used_bytes,
            swap_free_bytes,
            swap_used_percent,
        };

        // 3. Storage Snapshot
        let mut volumes = Vec::new();
        for disk in self.disks.iter() {
            let total = disk.total_space();
            let available = disk.available_space();
            let used = total.saturating_sub(available);
            let used_percent = if total > 0 {
                (used as f64 / total as f64 * 100.0) as f32
            } else {
                0.0
            };

            volumes.push(DiskVolumeInfo {
                name: disk.name().to_string_lossy().to_string(),
                mount_point: disk.mount_point().to_string_lossy().to_string(),
                file_system: disk.file_system().to_string_lossy().to_string(),
                total_bytes: total,
                available_bytes: available,
                used_bytes: used,
                used_percent,
                is_removable: disk.is_removable(),
            });
        }

        // Aggregate process disk read/write throughput
        let mut total_disk_read: u64 = 0;
        let mut total_disk_write: u64 = 0;
        for (_, proc) in self.system.processes() {
            let disk_usage = proc.disk_usage();
            total_disk_read = total_disk_read.saturating_add(disk_usage.read_bytes);
            total_disk_write = total_disk_write.saturating_add(disk_usage.written_bytes);
        }
        let disk_read_bytes_sec = (total_disk_read as f64 / elapsed_secs) as u64;
        let disk_write_bytes_sec = (total_disk_write as f64 / elapsed_secs) as u64;

        let storage_snapshot = StorageSnapshot {
            volumes,
            read_bytes_sec: disk_read_bytes_sec,
            write_bytes_sec: disk_write_bytes_sec,
        };

        // 4. Network Snapshot
        let mut interfaces = Vec::new();
        let mut total_rx_rate: u64 = 0;
        let mut total_tx_rate: u64 = 0;

        for (name, net) in self.networks.iter() {
            let rx = (net.received() as f64 / elapsed_secs) as u64;
            let tx = (net.transmitted() as f64 / elapsed_secs) as u64;
            total_rx_rate = total_rx_rate.saturating_add(rx);
            total_tx_rate = total_tx_rate.saturating_add(tx);

            interfaces.push(NetworkInterfaceSnapshot {
                name: name.clone(),
                rx_bytes_sec: rx,
                tx_bytes_sec: tx,
                total_rx_bytes: net.total_received(),
                total_tx_bytes: net.total_transmitted(),
            });
        }

        let network_snapshot = NetworkSnapshot {
            interfaces,
            total_rx_bytes_sec: total_rx_rate,
            total_tx_bytes_sec: total_tx_rate,
        };

        // 5. Host & Snapse Self-Monitoring Information
        let snapse_proc = self.system.process(Pid::from_u32(self.snapse_pid));
        let snapse_cpu_percent = snapse_proc.map(|p| p.cpu_usage()).unwrap_or(0.0) / (logical_cores.max(1) as f32);
        let snapse_memory_bytes = snapse_proc.map(|p| p.memory()).unwrap_or(0);

        let system_info = HostSystemInfo {
            os_name: System::name().unwrap_or_else(|| "Windows".to_string()),
            os_version: System::os_version().unwrap_or_else(|| "11".to_string()),
            kernel_version: System::kernel_version().unwrap_or_else(|| "NT 10.0".to_string()),
            host_name: System::host_name().unwrap_or_else(|| "DESKTOP".to_string()),
            uptime_seconds: System::uptime(),
            boot_time: System::boot_time(),
            snapse_pid: self.snapse_pid,
            snapse_cpu_percent,
            snapse_memory_bytes,
            is_admin: PlatformOps::is_current_process_elevated(),
        };

        let snapshot = SystemSnapshot {
            timestamp_ms,
            cpu: cpu_snapshot,
            memory: memory_snapshot,
            storage: storage_snapshot,
            network: network_snapshot,
            system: system_info,
        };

        // Push to history buffer
        self.history.push_system_point(SystemHistoryPoint {
            timestamp_ms,
            cpu_usage: total_cpu_usage,
            memory_used_bytes: used_bytes,
            memory_percent: used_percent,
            disk_read_bytes_sec,
            disk_write_bytes_sec,
            net_rx_bytes_sec: total_rx_rate,
            net_tx_bytes_sec: total_tx_rate,
        });

        // Evaluate alerts against current settings
        let current_settings = self.settings.get();
        self.alerts.evaluate(
            timestamp_ms,
            total_cpu_usage,
            used_percent,
            &current_settings,
        );

        // Record history samples for top processes
        let total_ram = self.system.total_memory();
        for (pid, proc) in self.system.processes() {
            let cpu_usage = proc.cpu_usage() / (logical_cores.max(1) as f32);
            let mem = proc.memory();
            // Record if non-trivial usage
            if cpu_usage > 0.5 || (mem as f64 / total_ram.max(1) as f64) > 0.01 {
                self.history.push_process_point(
                    pid.as_u32(),
                    ProcessHistorySample {
                        timestamp_ms,
                        cpu_usage,
                        memory_bytes: mem,
                    },
                );
            }
        }

        self.last_snapshot = Some(snapshot.clone());
        snapshot
    }

    pub fn get_processes(&self) -> Vec<ProcessSummary> {
        let logical_cores = self.system.cpus().len().max(1) as f32;
        let total_memory = self.system.total_memory();

        let mut list = Vec::new();
        for (pid, proc) in self.system.processes() {
            let raw_cpu = proc.cpu_usage();
            // Normalize CPU across all logical cores (Task Manager standard)
            let normalized_cpu = (raw_cpu / logical_cores).clamp(0.0, 100.0);
            let mem_bytes = proc.memory();
            let mem_percent = if total_memory > 0 {
                (mem_bytes as f64 / total_memory as f64 * 100.0) as f32
            } else {
                0.0
            };

            let ppid = proc.parent().map(|p| p.as_u32());
            let name = proc.name().to_string_lossy().to_string();
            let exe_path = proc.exe().map(|p| p.to_string_lossy().to_string());
            let cmd = if proc.cmd().is_empty() {
                None
            } else {
                Some(
                    proc.cmd()
                        .iter()
                        .map(|s| s.to_string_lossy().to_string())
                        .collect::<Vec<_>>()
                        .join(" "),
                )
            };

            let disk = proc.disk_usage();
            let user = proc.user_id().map(|u| u.to_string());
            let start_time = proc.start_time();
            let status = format!("{:?}", proc.status());

            let pid_u32 = pid.as_u32();
            let is_system = pid_u32 == 0 || pid_u32 == 4 || name.eq_ignore_ascii_case("System") || name.eq_ignore_ascii_case("Registry");

            list.push(ProcessSummary {
                pid: pid_u32,
                ppid,
                name,
                executable_path: exe_path,
                command_line: cmd,
                cpu_usage: normalized_cpu,
                memory_bytes: mem_bytes,
                memory_percent: mem_percent,
                disk_read_bytes_sec: disk.read_bytes,
                disk_write_bytes_sec: disk.written_bytes,
                user,
                start_time,
                status,
                thread_count: None,
                is_elevated: None,
                is_system,
                window_title: None,
            });
        }

        // Sort initially by CPU usage descending
        list.sort_by(|a, b| b.cpu_usage.partial_cmp(&a.cpu_usage).unwrap_or(std::cmp::Ordering::Equal));
        list
    }

    pub fn get_process_tree(&self) -> Vec<ProcessTreeNode> {
        let processes = self.get_processes();
        let mut map: std::collections::HashMap<u32, Vec<ProcessSummary>> = std::collections::HashMap::new();
        let mut root_candidates = Vec::new();

        let all_pids: std::collections::HashSet<u32> = processes.iter().map(|p| p.pid).collect();

        for proc in processes {
            if let Some(ppid) = proc.ppid {
                if all_pids.contains(&ppid) && ppid != proc.pid {
                    map.entry(ppid).or_default().push(proc);
                    continue;
                }
            }
            root_candidates.push(proc);
        }

        fn build_node(
            proc: ProcessSummary,
            map: &std::collections::HashMap<u32, Vec<ProcessSummary>>,
        ) -> ProcessTreeNode {
            let pid = proc.pid;
            let children = if let Some(kids) = map.get(&pid) {
                kids.iter()
                    .map(|k| build_node(k.clone(), map))
                    .collect()
            } else {
                Vec::new()
            };
            ProcessTreeNode {
                process: proc,
                children,
            }
        }

        root_candidates
            .into_iter()
            .map(|r| build_node(r, &map))
            .collect()
    }

    pub fn get_process_details(&self, pid: u32) -> Option<ProcessDetails> {
        let sys_pid = Pid::from_u32(pid);
        let proc = self.system.process(sys_pid)?;

        let logical_cores = self.system.cpus().len().max(1) as f32;
        let total_memory = self.system.total_memory();
        let normalized_cpu = (proc.cpu_usage() / logical_cores).clamp(0.0, 100.0);
        let mem_bytes = proc.memory();
        let mem_percent = if total_memory > 0 {
            (mem_bytes as f64 / total_memory as f64 * 100.0) as f32
        } else {
            0.0
        };

        let ppid = proc.parent().map(|p| p.as_u32());
        let parent_name = ppid.and_then(|p| self.system.process(Pid::from_u32(p)).map(|parent| parent.name().to_string_lossy().to_string()));

        let summary = ProcessSummary {
            pid,
            ppid,
            name: proc.name().to_string_lossy().to_string(),
            executable_path: proc.exe().map(|p| p.to_string_lossy().to_string()),
            command_line: if proc.cmd().is_empty() {
                None
            } else {
                Some(proc.cmd().iter().map(|s| s.to_string_lossy().to_string()).collect::<Vec<_>>().join(" "))
            },
            cpu_usage: normalized_cpu,
            memory_bytes: mem_bytes,
            memory_percent: mem_percent,
            disk_read_bytes_sec: proc.disk_usage().read_bytes,
            disk_write_bytes_sec: proc.disk_usage().written_bytes,
            user: proc.user_id().map(|u| u.to_string()),
            start_time: proc.start_time(),
            status: format!("{:?}", proc.status()),
            thread_count: None,
            is_elevated: None,
            is_system: pid == 0 || pid == 4,
            window_title: None,
        };

        let history = self.history.get_process_history(pid, 300);

        Some(ProcessDetails {
            process: summary,
            parent_name,
            history,
            handles_count: None,
            working_set_private_bytes: Some(mem_bytes),
            virtual_size_bytes: Some(proc.virtual_memory()),
        })
    }

    pub fn handle_process_action(&mut self, req: ProcessActionRequest) -> ProcessActionResult {
        let res = if req.force {
            PlatformOps::force_terminate_process(req.pid, req.start_time)
        } else {
            PlatformOps::request_close_process(req.pid, req.start_time)
        };

        match res {
            Ok(_) => ProcessActionResult {
                success: true,
                pid: req.pid,
                message: if req.force {
                    format!("Process {} was terminated successfully.", req.pid)
                } else {
                    format!("Close request sent to process {} windows.", req.pid)
                },
            },
            Err(err) => ProcessActionResult {
                success: false,
                pid: req.pid,
                message: err,
            },
        }
    }

    pub fn get_system_history(&self, seconds: u64) -> Vec<SystemHistoryPoint> {
        self.history.get_system_history(seconds)
    }

    pub fn get_alerts(&self) -> Vec<crate::models::AlertEvent> {
        self.alerts.get_alerts()
    }

    pub fn acknowledge_alert(&mut self, alert_id: &str) -> bool {
        self.alerts.acknowledge_alert(alert_id)
    }

    pub fn get_settings(&self) -> crate::models::AppSettings {
        self.settings.get()
    }

    pub fn save_settings(&mut self, new_settings: crate::models::AppSettings) -> Result<(), String> {
        self.settings.save(new_settings)
    }

    pub fn configure_research(&mut self, mode: SamplingMode, config: Option<ControllerConfig>) {
        self.sampling_mode = mode;
        if let Some(cfg) = config {
            self.volatility_controller = VolatilityController::new(cfg);
        } else {
            self.volatility_controller.reset();
        }
        self.target_interval_ms = mode.target_interval_ms();
    }

    pub fn start_research(&mut self) {
        self.research_records.clear();
        self.is_research_active = true;
        self.last_sample_instant = Instant::now();
    }

    pub fn stop_research(&mut self) -> Vec<ResearchTelemetryRecord> {
        self.is_research_active = false;
        self.research_records.clone()
    }

    pub fn get_research_records(&self) -> Vec<ResearchTelemetryRecord> {
        self.research_records.clone()
    }

    pub fn step_research(&mut self) -> ResearchTelemetryRecord {
        let step_start = Instant::now();
        let actual_interval_ms = (step_start - self.last_sample_instant).as_secs_f64() * 1000.0;
        self.last_sample_instant = step_start;

        let snapshot = self.refresh_all();
        let collection_duration_us = step_start.elapsed().as_micros() as u64;

        let mut obs_cpu = 0.0f32;
        let mut obs_mem = 0u64;
        if let Some(p) = self.system.process(Pid::from_u32(self.snapse_pid)) {
            obs_cpu = p.cpu_usage();
            obs_mem = p.memory();
        }

        let sys_cpu = snapshot.cpu.total_usage_percent;
        let sys_mem_pct = snapshot.memory.used_percent;
        let proc_count = self.system.processes().len() as u32;

        let (state_str, target_interval, inst_v, smooth_v) = match self.sampling_mode {
            SamplingMode::Fixed250 => ("FIXED_250".to_string(), 250, 0.0, 0.0),
            SamplingMode::Fixed500 => ("FIXED_500".to_string(), 500, 0.0, 0.0),
            SamplingMode::Fixed1000 => ("FIXED_1000".to_string(), 1000, 0.0, 0.0),
            SamplingMode::Fixed2000 => ("FIXED_2000".to_string(), 2000, 0.0, 0.0),
            SamplingMode::Adaptive => {
                let (st, target_ms, iv, sv) = self.volatility_controller.step(sys_cpu, sys_mem_pct, proc_count);
                (st.as_str().to_string(), target_ms, iv, sv)
            }
        };

        self.target_interval_ms = target_interval;
        let jitter_ms = (actual_interval_ms - target_interval as f64).abs();

        let rec = ResearchTelemetryRecord {
            timestamp_ms: snapshot.timestamp_ms,
            mode: match self.sampling_mode {
                SamplingMode::Fixed250 => "Fixed_250ms".to_string(),
                SamplingMode::Fixed500 => "Fixed_500ms".to_string(),
                SamplingMode::Fixed1000 => "Fixed_1000ms".to_string(),
                SamplingMode::Fixed2000 => "Fixed_2000ms".to_string(),
                SamplingMode::Adaptive => "Adaptive_VAC".to_string(),
            },
            target_interval_ms: target_interval,
            actual_interval_ms,
            jitter_ms,
            collection_duration_us,
            observer_cpu_percent: obs_cpu,
            observer_memory_bytes: obs_mem,
            state: state_str,
            volatility_score: inst_v,
            smoothed_volatility: smooth_v,
            system_cpu_percent: sys_cpu,
            system_memory_percent: sys_mem_pct,
            process_count: proc_count,
        };

        if self.is_research_active {
            self.research_records.push(rec.clone());
        }

        rec
    }
}
