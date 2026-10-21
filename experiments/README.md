# Snapse Research Benchmark and Evaluation Suite

This directory contains the complete empirical evaluation infrastructure for the Snapse systems performance research study on Windows NT.

---

## Directory Organization

```
experiments/
├── DATA_DICTIONARY.md            <- Complete schema definitions and metric units
├── REPRODUCE.md                  <- Step-by-step replication and reproduction guide
├── manifests/
│   ├── experiment_manifest.csv   <- Metadata and summary stats for each benchmark run
│   └── workload_groundtruth.csv  <- Exact microsecond injection timestamps of synthetic bursts
├── workloads/
│   ├── cpu_burst.ps1             <- Configurable multithreaded CPU burst workload
│   ├── memory_ramp.ps1           <- Bounded physical memory allocation and hold script
│   ├── disk_io.ps1               <- Direct write-through disk I/O generator
│   └── churn_scenario.ps1        <- Automated multi-phase composite churn suite
├── scripts/
│   ├── run_experiments.ps1       <- Automated test harness coordinating workloads and monitor
│   ├── analyze_results.py        <- Statistical calculation pipeline (parametric & non-parametric)
│   └── generate_figures.py       <- 300 DPI publication figure generator (Figures 1-9)
├── raw/                          <- Machine-readable raw execution telemetry CSV traces
└── processed/
    ├── summary_table.csv         <- Aggregated statistics across all conditions
    ├── fidelity_table.csv        <- Metric estimation error (MAE, RMSE, Pearson r)
    └── statistical_tests.csv     <- Statistical significance tests (Wilcoxon, Cliff's delta)
```

---

## Evaluated Conditions

1. **Fixed_250ms**: Continuous high-frequency interrogation ($T = 250\text{ms}$).
2. **Fixed_500ms**: Medium-high frequency interrogation ($T = 500\text{ms}$).
3. **Fixed_1000ms**: Standard default polling rate ($T = 1000\text{ms}$).
4. **Fixed_2000ms**: Coarse low-power polling rate ($T = 2000\text{ms}$).
5. **Adaptive_VAC**: Volatility-Aware Controller with dual-threshold hysteresis ($\theta_{\text{high}}=12.0\%, \theta_{\text{low}}=4.0\%$) and 4-cycle cool-down decay.

---

## Hardware and Host Environment

- **Operating System**: Microsoft Windows 11 Enterprise (64-bit)
- **Architecture**: x86_64
- **Runtime**: Native Rust release binary (`benchmark.exe`) built with LLVM/MinGW toolchain (`opt-level = 3`, LTO enabled)
- **Presentation Engine**: Tauri 2 + Chromium/WebView2
