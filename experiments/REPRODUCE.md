# Snapse Empirical Study: Reproduction and Replication Guide

This guide provides step-by-step instructions for executing the complete empirical benchmark suite, validating statistical results, and generating all publication figures.

---

## 1. Prerequisites and Environment

- **Operating System**: Microsoft Windows 10/11 x64.
- **Rust Toolchain**: `rustc` 1.80+ and `cargo` (MSVC or GNU/MinGW toolchain).
- **PowerShell**: Version 5.1 or PowerShell 7 Core.
- **Python Runtime**: Python 3.10+ with `numpy`, `scipy`, and `matplotlib`.
  ```powershell
  pip install numpy scipy matplotlib
  ```

---

## 2. Quick Sanity Pilot Run (~2 minutes)

To verify end-to-end functionality of the workload scripts, telemetry capture, and data pipelines without running full 10-repetition batches:

```powershell
cd D:\OS\Snapse
powershell -ExecutionPolicy Bypass -File .\experiments\scripts\run_experiments.ps1 -Pilot
```

Expected output:
- Compiles the release binary `benchmark.exe`.
- Runs 1 trial across each of the 5 conditions (`Fixed_250ms` through `Adaptive_VAC`) under `Idle_Baseline` and `Churn_Bursts`.
- Generates raw CSV files in `experiments/raw/`.
- Appends run entries to `experiments/manifests/experiment_manifest.csv`.

---

## 3. Full Benchmark Suite Execution (~25 minutes)

To execute the full formal experimental evaluation across all 10 repetitions per condition:

```powershell
cd D:\OS\Snapse
powershell -ExecutionPolicy Bypass -File .\experiments\scripts\run_experiments.ps1 -Reps 10 -DurationSec 20
```

---

## 4. Processing Telemetry & Generating Statistical Tables

Run the automated data analysis pipeline:

```powershell
python .\experiments\scripts\analyze_results.py
```

Outputs created:
- `experiments/processed/summary_table.csv`: Grouped non-parametric and parametric statistics (mean, median, IQR, jitter, collection duration).
- `experiments/processed/fidelity_table.csv`: Mean Absolute Error (MAE), RMSE, and Pearson correlation ($r$) relative to ground truth.
- `paper/claim_evidence_matrix.csv`: Direct mappings between every claim in the manuscript and empirical data evidence.

---

## 5. Generating Publication Figures (Fig 1 to Fig 9)

Run the figure generator:

```powershell
python .\experiments\scripts\generate_figures.py
```

High-resolution 300 DPI figures will be rendered in `paper/figures/`:
- `fig1_architecture.png`
- `fig2_timeline_comparison.png`
- `fig3_cpu_overhead.png`
- `fig4_memory_footprint.png`
- `fig5_timing_jitter.png`
- `fig6_fidelity_mae_pearson.png`
- `fig7_detection_latency.png`
- `fig8_hysteresis_stability.png`
- `fig9_pareto_frontier.png`

---

## 6. Unit Test Verification

To verify the deterministic finite state machine, hysteresis rules, and safety guards:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml
```
All 10 unit tests should pass with code 0.
