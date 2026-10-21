#[cfg(test)]
mod tests {
    use crate::alerts::AlertEvaluator;
    use crate::history::HistoryManager;
    use crate::models::{AppSettings, ProcessHistorySample, SystemHistoryPoint};
    use crate::platform::PlatformOps;

    #[test]
    fn test_settings_default_and_serialization() {
        let default_settings = AppSettings::default();
        assert_eq!(default_settings.refresh_interval_ms, 1000);
        assert_eq!(default_settings.alert_cpu_threshold, 85.0);
        assert_eq!(default_settings.theme, "dark");

        let serialized = serde_json::to_string(&default_settings).expect("serialization failed");
        let deserialized: AppSettings = serde_json::from_str(&serialized).expect("deserialization failed");
        assert_eq!(deserialized.refresh_interval_ms, 1000);
        assert_eq!(deserialized.alert_cpu_threshold, 85.0);
    }

    #[test]
    fn test_history_buffer_limits() {
        let max_samples = 5;
        let mut history = HistoryManager::new(max_samples, max_samples);
        let now = chrono::Utc::now().timestamp_millis();

        for i in 0..10 {
            history.push_system_point(SystemHistoryPoint {
                timestamp_ms: now + i * 1000,
                cpu_usage: i as f32 * 10.0,
                memory_used_bytes: 1024 * 1024 * i as u64,
                memory_percent: i as f32 * 5.0,
                disk_read_bytes_sec: 0,
                disk_write_bytes_sec: 0,
                net_rx_bytes_sec: 0,
                net_tx_bytes_sec: 0,
                gpu_utilization: None,
            });
        }

        let retrieved = history.get_system_history(60);
        assert_eq!(retrieved.len(), max_samples);
        // The first element should be sample 5 (0-indexed) because 0..4 were evicted
        assert_eq!(retrieved.first().unwrap().cpu_usage, 50.0);
        assert_eq!(retrieved.last().unwrap().cpu_usage, 90.0);
    }



    #[test]
    fn test_process_history_cleanup() {
        let mut history = HistoryManager::new(10, 5);
        let now = chrono::Utc::now().timestamp_millis();

        history.push_process_point(100, ProcessHistorySample {
            timestamp_ms: now,
            cpu_usage: 12.5,
            memory_bytes: 50_000_000,
        });
        history.push_process_point(200, ProcessHistorySample {
            timestamp_ms: now,
            cpu_usage: 25.0,
            memory_bytes: 100_000_000,
        });

        assert_eq!(history.get_process_history(100, 60).len(), 1);
        assert_eq!(history.get_process_history(200, 60).len(), 1);

        // Process 200 exited, only 100 is active
        history.cleanup_stale_processes(&[100]);
        assert_eq!(history.get_process_history(100, 60).len(), 1);
        assert_eq!(history.get_process_history(200, 60).len(), 0);
    }

    #[test]
    fn test_alert_rule_evaluation() {
        let mut evaluator = AlertEvaluator::new(10);
        let settings = AppSettings {
            alert_cpu_threshold: 80.0,
            alert_cpu_duration_seconds: 3,
            alert_memory_threshold: 90.0,
            alert_memory_duration_seconds: 3,
            ..Default::default()
        };

        let t0 = 1000_000;
        // First spike: t0
        evaluator.evaluate(t0, 85.0, 50.0, &settings);
        assert_eq!(evaluator.get_alerts().len(), 0, "Alert should not fire immediately on first spike");

        // Spike sustained for 2 seconds (< 3s threshold)
        evaluator.evaluate(t0 + 2000, 86.0, 50.0, &settings);
        assert_eq!(evaluator.get_alerts().len(), 0, "Alert should not fire before duration elapsed");

        // Spike sustained for 4 seconds (>= 3s threshold)
        evaluator.evaluate(t0 + 4000, 88.0, 50.0, &settings);
        let alerts = evaluator.get_alerts();
        assert_eq!(alerts.len(), 1, "Alert must fire when sustained threshold is crossed");
        assert_eq!(alerts[0].metric, "CPU");
        assert_eq!(alerts[0].acknowledged, false);

        // Alert acknowledgement
        let alert_id = alerts[0].id.clone();
        assert!(evaluator.acknowledge_alert(&alert_id));
        let updated_alerts = evaluator.get_alerts();
        assert!(updated_alerts[0].acknowledged);
    }

    #[test]
    fn test_process_safety_guards() {
        // PID 0 (System Idle) must be rejected
        let res_pid0 = PlatformOps::validate_process_action(0, 0);
        assert!(res_pid0.is_err());
        assert!(res_pid0.unwrap_err().contains("System Idle"));

        // PID 4 (Kernel System) must be rejected
        let res_pid4 = PlatformOps::validate_process_action(4, 0);
        assert!(res_pid4.is_err());
        assert!(res_pid4.unwrap_err().contains("Kernel System"));

        // Current process self-termination must be rejected
        let my_pid = std::process::id();
        let res_self = PlatformOps::validate_process_action(my_pid, 0);
        assert!(res_self.is_err());
        assert!(res_self.unwrap_err().contains("Cannot terminate Snapse"));
    }

    #[test]
    #[cfg(windows)]
    fn test_live_process_lifecycle_actions() {
        // 1. Spawn a harmless child process
        let mut child = std::process::Command::new("notepad.exe")
            .spawn()
            .expect("Failed to spawn notepad for test");
        let pid = child.id();
        std::thread::sleep(std::time::Duration::from_millis(250));

        let creation_time = PlatformOps::get_process_creation_time(pid)
            .expect("Must obtain creation time for live process");
        assert!(creation_time > 0);

        // 2. Identity mismatch check: passing wrong start time (e.g. 1000s in past) must fail
        let mismatch_res = PlatformOps::validate_process_action(pid, creation_time.saturating_sub(1000));
        assert!(mismatch_res.is_err());
        assert!(mismatch_res.unwrap_err().contains("Process identity mismatch"));

        // 3. Force terminate child process
        let term_res = PlatformOps::force_terminate_process(pid, creation_time);
        assert!(term_res.is_ok(), "force_terminate_process should succeed on live child");

        let status = child.wait().expect("Failed to wait on terminated process");
        assert!(!status.success());

        // 4. Terminating already-exited process must fail gracefully
        drop(child); // Close parent handle so Windows releases zombie process object
        std::thread::sleep(std::time::Duration::from_millis(100));
        let exited_res = PlatformOps::force_terminate_process(pid, creation_time);
        assert!(exited_res.is_err(), "Terminating an already-exited process must fail");
        let err_msg = exited_res.unwrap_err();
        assert!(
            err_msg.contains("no longer accessible")
                || err_msg.contains("already terminated")
                || err_msg.contains("Could not open PID"),
            "Error message should indicate process is inaccessible or terminated, got: {}",
            err_msg
        );
    }

    #[test]
    fn test_csv_export_formatting() {
        let mut wtr = csv::Writer::from_writer(vec![]);
        wtr.write_record(&["PID", "Name", "CPU", "Memory_MB"]).unwrap();
        wtr.write_record(&["1234", "snapse.exe", "1.25", "45.50"]).unwrap();
        let bytes = wtr.into_inner().unwrap();
        let csv_str = String::from_utf8(bytes).unwrap();
        assert!(csv_str.contains("PID,Name,CPU,Memory_MB"));
        assert!(csv_str.contains("1234,snapse.exe,1.25,45.50"));
    }

    #[test]
    fn test_settings_file_persistence_on_disk() {
        let temp_dir = std::env::temp_dir().join(format!("snapse_test_{}", std::process::id()));
        let _ = std::fs::create_dir_all(&temp_dir);
        let settings_path = temp_dir.join("settings.json");

        let mut custom = AppSettings::default();
        custom.refresh_interval_ms = 2500;
        custom.alert_cpu_threshold = 92.5;
        custom.theme = "light".to_string();

        let serialized = serde_json::to_string_pretty(&custom).unwrap();
        std::fs::write(&settings_path, &serialized).unwrap();

        // Read back from file
        let read_content = std::fs::read_to_string(&settings_path).unwrap();
        let loaded: AppSettings = serde_json::from_str(&read_content).unwrap();

        assert_eq!(loaded.refresh_interval_ms, 2500);
        assert_eq!(loaded.alert_cpu_threshold, 92.5);
        assert_eq!(loaded.theme, "light");

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
