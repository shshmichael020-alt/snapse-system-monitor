# Snapse Architecture & Systems Engineering

## 1. Overview & Core Philosophy

**Snapse** is a high-performance Windows desktop task manager and hardware telemetry suite engineered to replace the default Windows Task Manager for power users, developers, and system administrators.

Built on **Tauri 2**, a pure native **Rust** backend, and a **React / TypeScript / Tailwind CSS** frontend adhering to the Fluent Precision Modernist design system, Snapse provides real-time tactical awareness with near-zero observer overhead.

```
+------------------------------------------------------------------+
|                    React / TypeScript Frontend                   |
|  - Frameless Fluent TitleBar with Native Window Dragging        |
|  - High-Density Data Grids (Processes, Tree Hierarchy)          |
|  - ECharts 2D Telemetry & Three.js 3D Resource Landscape        |
+------------------------------------------------------------------+
                                 |  Tauri IPC (Typed JSON RPC)
                                 v
+------------------------------------------------------------------+
|                        Tauri 2 Runtime                           |
|  - Window Management & Native Event Loop                         |
|  - Capability Security Policies                                  |
+------------------------------------------------------------------+
                                 |
                                 v
+------------------------------------------------------------------+
|                        Rust Core Engine                          |
|  - Centralized Periodic Monitoring Loop (1s baseline / adaptive) |
|  - Delta-Based Throughput Computing (Disk I/O, Network Bps)      |
|  - Bounded In-Memory Ring Buffer (60s, 300s, 900s)               |
|  - Sustained Threshold Alert Rules Evaluator                     |
|  - Process Verification & Protected PID Enforcer                 |
+------------------------------------------------------------------+
                                 |
                                 v
+------------------------------------------------------------------+
|                    Windows Operating System                      |
|  - Win32 APIs (OpenProcess, TerminateProcess, EnumWindows)       |
|  - sysinfo (Kernel / NT Hardware Counters)                      |
|  - Security Tokens (Elevation & Privileges)                      |
+------------------------------------------------------------------+
```

---

## 2. Telemetry & Metric Measurement Conventions

### A. CPU Measurement & Normalization
Windows Task Manager normalizes CPU usage across all logical processor cores ($100\%$ represents all threads saturated across all cores). Snapse strictly conforms to this convention:
$$\text{Normalized CPU \%} = \frac{\sum_{i=1}^{N} \text{CoreUsage}_i}{N}$$
Where $N$ is the number of logical processors.

### B. Memory Definitions
- **Physical RAM Total / Used**: Operating system physical RAM allocated across all tasks.
- **Available RAM**: Memory immediately available for allocation without paging out.
- **Pagefile / Commit Charge**: Total virtual address space committed by all processes.
- **Process Working Set**: Physical memory pages currently resident in RAM for a specific process.

### C. Throughput Calculations
Disk and Network throughput are calculated strictly using timestamped delta differences:
$$\text{Rate (Bytes/sec)} = \frac{\Delta \text{Bytes}}{\Delta t \text{ (seconds)}}$$
Deltas protect against counter resets, interface re-initializations, and variable poll intervals.

---

## 3. Process Management & Identity Safety

To eliminate race conditions and PID reuse attacks:
1. **PID & Start-Time Tuple**: Every destructive action requires both the PID and the verified creation timestamp:
   $$\text{Process Identity} = (\text{PID}, \text{CreationTime})$$
2. **Pre-action Validation**:
   - Denies termination of PID 0 (System Idle) and PID 4 (NT Kernel System).
   - Denies termination of Snapse's own PID.
   - Re-queries `GetProcessTimes` immediately prior to `OpenProcess`. If the timestamp deviates by $> 2$ seconds, execution is aborted with an identity mismatch error.
3. **Graceful Close vs Force Termination**:
   - **Graceful Close**: Enumerate visible top-level `HWND` handles owned by the process and posts `WM_CLOSE`.
   - **Force End Task**: Acquires `PROCESS_TERMINATE` and executes `TerminateProcess`.

---

## 4. History Buffer & Local Persistence

1. **Bounded Ring Buffers**: Uses bounded `VecDeque` collections capped at 3,600 samples for system telemetry and 300 samples for active processes. This guarantees flat, deterministic RAM usage ($< 50 \text{ MB}$) even during multi-day continuous monitoring.
2. **Settings**: Stored locally in `%APPDATA%\Snapse\settings.json`. Zero telemetry is dispatched to any external server or cloud service.

---

## 5. Cross-Platform Abstraction

While V1 is optimized for Windows NT, all platform-dependent code is isolated behind the internal `PlatformOps` abstraction in `src-tauri/src/platform/`. Future Linux (`/proc` and `cgroups`) and macOS (`libproc`) implementations can be plugged in without refactoring the frontend or command interface.
