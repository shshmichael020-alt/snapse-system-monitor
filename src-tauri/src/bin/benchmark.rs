use std::env;
use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::Path;
use std::thread::sleep;
use std::time::{Duration, Instant};

use snapse_lib::monitoring::{
    ControllerConfig, MonitoringEngine, ResearchTelemetryRecord, SamplingMode,
};

fn parse_arg(args: &[String], key: &str, default_val: &str) -> String {
    for i in 0..args.len() {
        if args[i] == key && i + 1 < args.len() {
            return args[i + 1].clone();
        }
    }
    default_val.to_string()
}

fn run_single_experiment(
    mode: SamplingMode,
    mode_name: &str,
    rep: usize,
    workload: &str,
    duration_secs: u64,
    output_dir: &str,
    manifest_path: &str,
) {
    println!(
        "-> Starting Run: Mode={}, Rep={}, Workload={}, Duration={}s",
        mode_name, rep, workload, duration_secs
    );

    let mut engine = MonitoringEngine::new();
    engine.configure_research(mode, Some(ControllerConfig::default()));
    engine.start_research();

    let start_instant = Instant::now();
    let duration = Duration::from_secs(duration_secs);

    let mut records: Vec<ResearchTelemetryRecord> = Vec::new();

    while start_instant.elapsed() < duration {
        let rec = engine.step_research();
        let sleep_ms = rec.target_interval_ms;
        records.push(rec);

        // Sleep for the target interval
        sleep(Duration::from_millis(sleep_ms));
    }

    let _ = engine.stop_research();
    let total_samples = records.len();

    // Calculate summary statistics
    let mean_interval: f64 = if total_samples > 0 {
        records.iter().map(|r| r.actual_interval_ms).sum::<f64>() / total_samples as f64
    } else {
        0.0
    };

    let mean_jitter: f64 = if total_samples > 0 {
        records.iter().map(|r| r.jitter_ms).sum::<f64>() / total_samples as f64
    } else {
        0.0
    };

    let mean_obs_cpu: f32 = if total_samples > 0 {
        records.iter().map(|r| r.observer_cpu_percent).sum::<f32>() / total_samples as f32
    } else {
        0.0
    };

    let mean_obs_mem_mb: f64 = if total_samples > 0 {
        (records.iter().map(|r| r.observer_memory_bytes).sum::<u64>() as f64 / total_samples as f64)
            / (1024.0 * 1024.0)
    } else {
        0.0
    };

    let mean_duration_us: f64 = if total_samples > 0 {
        records.iter().map(|r| r.collection_duration_us).sum::<u64>() as f64 / total_samples as f64
    } else {
        0.0
    };

    // Save detailed telemetry CSV
    let timestamp = chrono::Utc::now().timestamp_millis();
    let file_name = format!("telemetry_{}_rep{}_{}.csv", mode_name, rep, timestamp);
    let full_path = Path::new(output_dir).join(&file_name);
    create_dir_all(output_dir).expect("Failed to create raw output dir");

    let mut wtr = csv::Writer::from_path(&full_path).expect("Failed to create CSV writer");
    for r in &records {
        wtr.serialize(r).expect("Failed to write record");
    }
    wtr.flush().expect("Failed to flush CSV");

    // Append manifest record
    let manifest_exists = Path::new(manifest_path).exists();
    if let Some(parent) = Path::new(manifest_path).parent() {
        let _ = create_dir_all(parent);
    }

    let mut manifest_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(manifest_path)
        .expect("Failed to open manifest file");

    if !manifest_exists {
        writeln!(
            manifest_file,
            "RunID,Mode,Repetition,Workload,DurationSec,SamplesCount,MeanActualIntervalMs,MeanJitterMs,MeanObserverCpuPct,MeanObserverMemMB,MeanCollectionUs,TelemetryFile"
        )
        .expect("Failed to write manifest header");
    }

    let run_id = format!("{}_{}_{}", mode_name, workload, rep);
    writeln!(
        manifest_file,
        "{},{},{},{},{},{},{:.2},{:.2},{:.2},{:.2},{:.2},{}",
        run_id,
        mode_name,
        rep,
        workload,
        duration_secs,
        total_samples,
        mean_interval,
        mean_jitter,
        mean_obs_cpu,
        mean_obs_mem_mb,
        mean_duration_us,
        full_path.display()
    )
    .expect("Failed to append manifest entry");

    println!(
        "   -> Completed: {} samples, MeanObsCPU={:.2}%, MeanMem={:.2}MB, Saved to {}",
        total_samples,
        mean_obs_cpu,
        mean_obs_mem_mb,
        full_path.display()
    );
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let mode_str = parse_arg(&args, "--mode", "all");
    let reps_str = parse_arg(&args, "--reps", "3");
    let duration_str = parse_arg(&args, "--duration-sec", "15");
    let workload = parse_arg(&args, "--workload", "churn");
    let output_dir = parse_arg(&args, "--output-dir", "D:\\OS\\Snapse\\experiments\\raw");
    let manifest = parse_arg(
        &args,
        "--manifest",
        "D:\\OS\\Snapse\\experiments\\manifests\\experiment_manifest.csv",
    );

    let reps: usize = reps_str.parse().unwrap_or(3);
    let duration_secs: u64 = duration_str.parse().unwrap_or(15);

    let modes: Vec<(SamplingMode, &str)> = match mode_str.as_str() {
        "fixed250" => vec![(SamplingMode::Fixed250, "Fixed_250ms")],
        "fixed500" => vec![(SamplingMode::Fixed500, "Fixed_500ms")],
        "fixed1000" => vec![(SamplingMode::Fixed1000, "Fixed_1000ms")],
        "fixed2000" => vec![(SamplingMode::Fixed2000, "Fixed_2000ms")],
        "adaptive" => vec![(SamplingMode::Adaptive, "Adaptive_VAC")],
        _ => vec![
            (SamplingMode::Fixed250, "Fixed_250ms"),
            (SamplingMode::Fixed500, "Fixed_500ms"),
            (SamplingMode::Fixed1000, "Fixed_1000ms"),
            (SamplingMode::Fixed2000, "Fixed_2000ms"),
            (SamplingMode::Adaptive, "Adaptive_VAC"),
        ],
    };

    println!("============================================================");
    println!("  SNAPSE RESEARCH EMPIRICAL BENCHMARK SUITE");
    println!("  Modes to evaluate: {:?}", modes.iter().map(|m| m.1).collect::<Vec<_>>());
    println!("  Repetitions: {}, Duration: {}s per run", reps, duration_secs);
    println!("  Workload Scenario: {}", workload);
    println!("  Raw Telemetry Dir: {}", output_dir);
    println!("  Manifest File: {}", manifest);
    println!("============================================================");

    for (mode, mode_name) in &modes {
        for rep in 1..=reps {
            run_single_experiment(
                *mode,
                mode_name,
                rep,
                &workload,
                duration_secs,
                &output_dir,
                &manifest,
            );
        }
    }

    println!("\n All benchmark runs finished successfully!");
}
