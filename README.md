# Snapse — Desktop Task Manager & Hardware Telemetry Suite (Windows V1)

Snapse is a modern, high-performance Windows desktop task manager and hardware system monitor built as a tactical diagnostic utility for software engineers, DevOps practitioners, and power users.

Designed with **Fluent 2 Desktop Modernism** principles, Snapse combines real-time hardware telemetry (CPU, RAM, Disks, Network), process hierarchy inspection, and safe, identity-verified process controls.

---

## 1. Key Capabilities & Windows V1 Features

- **Accurate Real-Time Telemetry**:
  - Normalized CPU utilization matching Task Manager conventions, plus logical core breakdown.
  - Physical memory (used, free, available) and pagefile/commit tracking.
  - Delta-computed disk read/write throughput and detected volumes.
  - Network receive and transmit transfer rates per interface.
- **Process Management**:
  - Live process enumeration with PID, PPID, CPU %, memory working set, disk I/O, user, and status.
  - Fast search by process name, PID, or user.
  - Multi-field sorting (CPU, Memory, Name, PID).
  - Process inspector drawer showing executable paths, command lines, and resource metrics.
  - Guarded process actions: Graceful Window Close (`WM_CLOSE`) and Force End Task (`TerminateProcess`).
  - Strict process identity verification preventing PID reuse race conditions.
  - Protected system process guards (PID 0 and PID 4 protection, self-termination prevention).
- **Process Tree Hierarchy**:
  - Hierarchical parent-child tree inspector with expandable subtrees and thread memory footprints.
- **Performance Suite**:
  - Historical sparklines and continuous 2D area charts with customizable time windows (30s, 60s, 5m, 15m).
  - Logical processor multi-grid view showing individual core load.
- **Interactive 3D Resource Landscape**:
  - Three.js WebGL visualization mapping process identity, time, and CPU/memory utilization in 3D space with interactive orbit drag controls.
- **Sustained Pressure Alert Engine**:
  - Configurable CPU and memory threshold rules with sustained duration checks to eliminate false positives.
  - Alert acknowledgment and history logging.
- **Working Snapshot Exports**:
  - Export live process tables and historical samples to **CSV** or **JSON** with one click.
- **Local Persistence & Privacy**:
  - Settings stored locally in `%APPDATA%\Snapse\settings.json`. Zero telemetry uploaded to external servers.

---

## 2. Architecture & Technology Stack

- **Desktop Framework**: Tauri 2 (frameless window with native drag region)
- **Backend**: Rust 1.99+ with `sysinfo`, `tokio`, `parking_lot`, and Win32 APIs (`windows` crate)
- **Frontend**: React 18, TypeScript (strict), Vite 5, Tailwind CSS
- **Graphics**: SVG sparklines, HTML5 Canvas / ECharts, Three.js WebGL

---

## 3. Prerequisites

To build and run Snapse locally on Windows:
1. **Node.js**: v18+ (tested with v24)
2. **Rust**: 1.75+ (toolchain `x86_64-pc-windows-gnullvm` or `x86_64-pc-windows-msvc`)
3. **C/C++ Linker**: LLVM-MinGW (`clang`/`lld`) or Visual Studio C++ Build Tools
4. **WebView2**: Built into Windows 10 (version 1803+) and Windows 11

---

## 4. Setup & Local Development Instructions

### Install Dependencies
```powershell
npm install
```

### Run in Development Mode
To launch the desktop application with hot-reloading:
```powershell
npm run tauri dev
```

### Run Frontend in Browser (Mock/UI Preview)
```powershell
npm run dev
```

---

## 5. Automated Testing Instructions

### Run Rust Backend Unit Tests
Executes unit tests for ring buffers, alert evaluators, settings persistence, CSV serialization, and process identity safety guards:
```powershell
cd src-tauri
cargo test
```

### Run Frontend Type Checks and Production Build
```powershell
npm run build
```

---

## 6. Build and Packaging (Production Installer)

To package Snapse into a distributable Windows application:
```powershell
npm run tauri build
```
This generates the standalone executable and installer bundles in `src-tauri/target/release/bundle/`.

---

## 7. Known Limitations & Scope for Windows V1

- Standard monitoring operates under standard user privileges. Certain protected Windows kernel processes may deny handle opening unless Snapse is explicitly launched as Administrator.
- Hardware temperature sensors require manufacturer-specific WMI or ring-0 drivers; fallback values are noted when ACPI thermal zones are restricted by Windows.

---

## 8. Preserved Frontend Design Source & Research Suite

- **UI Design Assets**: Preserved design reference exports and screens are stored in [frontend-design-source/](file:///D:/OS/Snapse/frontend-design-source/).
- **Research Evaluation & Reproduction**:
  - Research protocol: [research/experimental_protocol.md](file:///D:/OS/Snapse/research/experimental_protocol.md)
  - Literature review & related work: [research/literature_review.md](file:///D:/OS/Snapse/research/literature_review.md)
  - Reproduction guide: [experiments/REPRODUCE.md](file:///D:/OS/Snapse/experiments/REPRODUCE.md)
  - Telemetry schema: [experiments/DATA_DICTIONARY.md](file:///D:/OS/Snapse/experiments/DATA_DICTIONARY.md)
  - Scholarly paper draft: [paper/manuscript.md](file:///D:/OS/Snapse/paper/manuscript.md)
