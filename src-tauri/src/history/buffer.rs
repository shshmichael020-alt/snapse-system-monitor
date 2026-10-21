use std::collections::{HashMap, VecDeque};
use crate::models::{ProcessHistorySample, SystemHistoryPoint};

pub struct HistoryManager {
    system_history: VecDeque<SystemHistoryPoint>,
    process_history: HashMap<u32, VecDeque<ProcessHistorySample>>,
    max_system_samples: usize,
    max_process_samples: usize,
}

impl HistoryManager {
    pub fn new(max_system_samples: usize, max_process_samples: usize) -> Self {
        Self {
            system_history: VecDeque::with_capacity(max_system_samples),
            process_history: HashMap::new(),
            max_system_samples,
            max_process_samples,
        }
    }

    pub fn push_system_point(&mut self, point: SystemHistoryPoint) {
        if self.system_history.len() >= self.max_system_samples {
            self.system_history.pop_front();
        }
        self.system_history.push_back(point);
    }

    pub fn push_process_point(&mut self, pid: u32, sample: ProcessHistorySample) {
        let entry = self
            .process_history
            .entry(pid)
            .or_insert_with(|| VecDeque::with_capacity(self.max_process_samples));
        if entry.len() >= self.max_process_samples {
            entry.pop_front();
        }
        entry.push_back(sample);
    }

    pub fn get_system_history(&self, seconds: u64) -> Vec<SystemHistoryPoint> {
        if self.system_history.is_empty() {
            return Vec::new();
        }
        let cutoff_ms = chrono::Utc::now().timestamp_millis() - (seconds as i64 * 1000);
        self.system_history
            .iter()
            .filter(|p| p.timestamp_ms >= cutoff_ms)
            .cloned()
            .collect()
    }

    pub fn get_process_history(&self, pid: u32, seconds: u64) -> Vec<ProcessHistorySample> {
        let cutoff_ms = chrono::Utc::now().timestamp_millis() - (seconds as i64 * 1000);
        if let Some(samples) = self.process_history.get(&pid) {
            samples
                .iter()
                .filter(|s| s.timestamp_ms >= cutoff_ms)
                .cloned()
                .collect()
        } else {
            Vec::new()
        }
    }

    pub fn cleanup_stale_processes(&mut self, active_pids: &[u32]) {
        let active_set: std::collections::HashSet<u32> = active_pids.iter().cloned().collect();
        self.process_history.retain(|pid, _| active_set.contains(pid));
    }

    pub fn clear(&mut self) {
        self.system_history.clear();
        self.process_history.clear();
    }
}
