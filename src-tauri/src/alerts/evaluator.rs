use std::collections::VecDeque;
use crate::models::{AlertEvent, AlertSeverity, AppSettings};

pub struct AlertEvaluator {
    alerts: VecDeque<AlertEvent>,
    max_alerts: usize,
    cpu_high_start_ms: Option<i64>,
    memory_high_start_ms: Option<i64>,
    cpu_alert_fired: bool,
    memory_alert_fired: bool,
}

impl AlertEvaluator {
    pub fn new(max_alerts: usize) -> Self {
        Self {
            alerts: VecDeque::with_capacity(max_alerts),
            max_alerts,
            cpu_high_start_ms: None,
            memory_high_start_ms: None,
            cpu_alert_fired: false,
            memory_alert_fired: false,
        }
    }

    pub fn evaluate(
        &mut self,
        timestamp_ms: i64,
        cpu_usage: f32,
        memory_percent: f32,
        settings: &AppSettings,
    ) {
        // Evaluate CPU sustained threshold
        if cpu_usage >= settings.alert_cpu_threshold {
            let start = self.cpu_high_start_ms.get_or_insert(timestamp_ms);
            let elapsed_secs = ((timestamp_ms - *start) / 1000) as u64;

            if elapsed_secs >= settings.alert_cpu_duration_seconds && !self.cpu_alert_fired {
                self.cpu_alert_fired = true;
                self.push_alert(AlertEvent {
                    id: format!("alert-cpu-{}", timestamp_ms),
                    timestamp_ms,
                    metric: "CPU".to_string(),
                    severity: if cpu_usage >= 95.0 {
                        AlertSeverity::Critical
                    } else {
                        AlertSeverity::Warning
                    },
                    message: format!(
                        "CPU utilization sustained at {:.1}% (threshold: {:.1}% for {}s)",
                        cpu_usage, settings.alert_cpu_threshold, settings.alert_cpu_duration_seconds
                    ),
                    value: cpu_usage,
                    threshold: settings.alert_cpu_threshold,
                    duration_seconds: elapsed_secs,
                    acknowledged: false,
                });
            }
        } else {
            self.cpu_high_start_ms = None;
            self.cpu_alert_fired = false;
        }

        // Evaluate Memory sustained threshold
        if memory_percent >= settings.alert_memory_threshold {
            let start = self.memory_high_start_ms.get_or_insert(timestamp_ms);
            let elapsed_secs = ((timestamp_ms - *start) / 1000) as u64;

            if elapsed_secs >= settings.alert_memory_duration_seconds && !self.memory_alert_fired {
                self.memory_alert_fired = true;
                self.push_alert(AlertEvent {
                    id: format!("alert-mem-{}", timestamp_ms),
                    timestamp_ms,
                    metric: "Memory".to_string(),
                    severity: if memory_percent >= 95.0 {
                        AlertSeverity::Critical
                    } else {
                        AlertSeverity::Warning
                    },
                    message: format!(
                        "Physical memory pressure at {:.1}% (threshold: {:.1}% for {}s)",
                        memory_percent, settings.alert_memory_threshold, settings.alert_memory_duration_seconds
                    ),
                    value: memory_percent,
                    threshold: settings.alert_memory_threshold,
                    duration_seconds: elapsed_secs,
                    acknowledged: false,
                });
            }
        } else {
            self.memory_high_start_ms = None;
            self.memory_alert_fired = false;
        }
    }

    fn push_alert(&mut self, alert: AlertEvent) {
        if self.alerts.len() >= self.max_alerts {
            self.alerts.pop_front();
        }
        self.alerts.push_back(alert);
    }

    pub fn get_alerts(&self) -> Vec<AlertEvent> {
        self.alerts.iter().cloned().collect()
    }

    pub fn acknowledge_alert(&mut self, alert_id: &str) -> bool {
        if let Some(alert) = self.alerts.iter_mut().find(|a| a.id == alert_id) {
            alert.acknowledged = true;
            true
        } else {
            false
        }
    }

    pub fn clear(&mut self) {
        self.alerts.clear();
    }
}
