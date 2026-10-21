# Snapse Research Plan: System Monitoring Overhead & Adaptive Sampling

## 1. Executive Summary & Research Motivation

Desktop system monitors and task managers provide real-time diagnostic visibility, yet the process of continuously sampling hardware counters and enumerating process tables introduces observer overhead—often termed the *Heisenberg Effect in Telemetry*.

This research evaluates whether an **Adaptive Monitoring Strategy** can achieve an optimal trade-off between prompt anomaly detection and CPU/RAM overhead compared to traditional fixed-interval sampling (e.g. standard 1,000ms polling).

---

## 2. Research Questions

- **RQ1 (Overhead Reduction)**: Can dynamic interval adaptation reduce Snapse's baseline CPU utilization below $0.5\%$ on low-load conditions without degrading UI responsiveness?
- **RQ2 (Spike Detection Latency)**: What is the mean latency penalty in detecting sudden CPU or memory spikes when transitioning from a throttled state ($2,000\text{ ms} - 5,000\text{ ms}$) back to high-resolution mode ($500\text{ ms} - 1,000\text{ ms}$)?
- **RQ3 (Memory Allocation Drift)**: Does continuous long-term historical ring buffering exhibit flat memory residency or creeping cache bloat over 24-hour periods?

---

## 3. Experimental Framework & Methodologies

### Baseline: Fixed-Interval Monitoring
- Fixed polling interval: $T_{\text{sample}} = 1000\text{ ms}$.
- Unconditional full-system refresh: CPU cores, virtual memory, disk volumes, network interfaces, and process table enumeration.

### Experimental: Adaptive Sampling Strategy
- Dynamic polling interval: $T_{\text{sample}} \in [500\text{ ms}, 5000\text{ ms}]$.
- State criteria:
  1. **Idle State**: Global $\text{CPU} < 10\%$ and no foreground user interaction $\implies T_{\text{sample}} = 2000\text{ ms}$.
  2. **Active State**: Foreground inspector drawer open or active user filtering $\implies T_{\text{sample}} = 1000\text{ ms}$.
  3. **High Stress / Pressure State**: Global $\text{CPU} > 75\%$ or $\Delta \text{CPU} > 25\% \implies T_{\text{sample}} = 500\text{ ms}$.

$$\text{NextInterval}(t) = \begin{cases} 
500\text{ ms} & \text{if } \text{CPU}(t) \ge 75\% \lor \text{InspectorActive} \\
1000\text{ ms} & \text{if } 10\% \le \text{CPU}(t) < 75\% \\
2000\text{ ms} & \text{if } \text{CPU}(t) < 10\% \land \neg \text{InspectorActive}
\end{cases}$$

---

## 4. Measurement Definitions & Metrics

1. **Snapse Observer CPU Usage**:
   - Monitored self-consumption retrieved directly from Windows kernel process counters:
     $$\text{Snapse CPU \%} = \frac{\text{SnapseRawCpuUsage}}{\text{LogicalCores}}$$
2. **Snapse Private Working Set**:
   - Memory resident in physical RAM strictly dedicated to the Snapse desktop process (excluding shared DLLs).
3. **Detection Latency**:
   - Time delta $t_{\text{detected}} - t_{\text{injected}}$ where $t_{\text{injected}}$ is the timestamp of an automated synthetic load spike and $t_{\text{detected}}$ is the timestamp of the first recorded sample exceeding threshold.

---

## 5. Controlled Test Scenarios

1. **Scenario A (Steady-State Idle)**: Windows desktop idle with standard background services for 60 minutes.
2. **Scenario B (Burst Workload)**: Synthetic 10-second multi-threaded matrix multiplication spike injected every 2 minutes.
3. **Scenario C (Heavy Multitasking)**: 1,500 simulated threads and 300 active processes running under memory pressure.

---

## 6. Reproducibility & Open Diagnostics

All experiment configuration toggles, timestamped raw samples, and diagnostic metrics are exportable directly from the Snapse UI in standard JSON and CSV format via the **Export Snapshot** command.
