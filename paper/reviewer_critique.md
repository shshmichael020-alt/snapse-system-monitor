# Critical Peer Review Simulation and Defense Matrix

## Reviewer 1: Systems Performance Purist (Focus: Perturbation, Timer Limits, Micro-benchmarks)

### Critique 1.1: "Windows timer resolution is notoriously coarse (~15.6ms default). How can you claim sub-second sampling precision?"
- **Defense & Resolution**: We explicitly address Windows timer granularity. The benchmark engine uses high-resolution `Instant::now()` (which maps to `QueryPerformanceCounter` on Windows, providing sub-microsecond resolution). We report empirical timer jitter in Figure 5 and Table 1 (mean jitter 4.2ms to 8.1ms), acknowledging that OS thread quantum and sleep scheduling prevent exact 0.0ms jitter without raising global timer interrupt frequency via `timeBeginPeriod(1)`.

### Critique 1.2: "Why not use Event Tracing for Windows (ETW) instead of periodic polling?"
- **Defense & Resolution**: Section 2.4 contrasts push-based ETW kernel tracing with pull-based process enumeration. While ETW provides event-driven callback semantics, consuming real-time ETW kernel buffers requires administrative privileges (`SeCreateGlobalPrivilege`), introduces kernel buffer overflow hazards under massive I/O storms, and imposes heavy CPU decoding overhead in user space. Desktop task managers intended for standard (non-elevated) user accounts must rely on Win32 and `NtQuerySystemInformation` polling.

---

## Reviewer 2: Empirical Software Engineering Specialist (Focus: Generality, Workload Realism, Stats)

### Critique 2.1: "Synthetic workloads (matrix sqrt, byte arrays) do not represent real-world developer workflows."
- **Defense & Resolution**: We acknowledge synthetic workloads as a controlled baseline designed to establish reproducible ground-truth event boundaries. In Section 5.3, we discuss real-world ecological validity, detailing how continuous background compilations (`cargo build`), web browser tab spawning, and video conferencing mirror the multi-resource churn scenarios evaluated in the paper.

### Critique 2.2: "Did you verify that the adaptive controller does not flap uncontrollably under noisy metric streams?"
- **Defense & Resolution**: RQ5 and Figure 8 directly evaluate controller flapping. We prove mathematically and empirically that the dual-threshold hysteresis window ($\theta_{\text{high}} = 12.0\%, \theta_{\text{low}} = 4.0\%$) combined with a mandatory 4-cycle cool-down decay reduces state oscillation by $> 81\%$ compared to single-threshold triggers.

---

## Reviewer 3: Operating Systems Architect (Focus: Novelty, Architecture, Tauri vs Electron)

### Critique 3.1: "Adaptive sampling is well-known in networking and tracing. What is the fundamental intellectual contribution?"
- **Defense & Resolution**: We explicitly disclaim "inventing adaptive sampling" in Section 1 and Section 3. The scientific contribution lies in the first formal Pareto characterization of desktop task monitoring overhead on Windows NT, quantifying the non-linear inflection point between kernel snapshot frequency, Tauri IPC message throughput, and metric estimation error. We prove that a deterministic FSM shifts the Pareto frontier by reducing steady-state overhead by 70% while bounding transient spike latency within 250ms.

### Critique 3.2: "How much of the monitor overhead is caused by WebView2 rather than the Rust backend?"
- **Defense & Resolution**: The study disaggregates backend collection cost ($\mathcal{O}_{\text{collection}} \approx 380\mu\text{s}$) from UI rendering and IPC message passing. The benchmark runner isolates backend interrogation costs, while Section 4 quantifies the compounding effect when high-frequency snapshots saturate the WebView2 message queue.
