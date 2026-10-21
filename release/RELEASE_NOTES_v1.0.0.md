# Snapse Windows v1.0.0

**Snapse** is a modern, high-performance Windows Task Manager and system telemetry suite engineered with **Rust**, **Tauri 2**, and **React 18 / TypeScript**. It provides real-time NT kernel process enumeration, DXGI GPU telemetry, IP Helper network monitoring, custom window controls, and adaptive sampling.

---

## 🚀 Key Features

- **Live Windows Telemetry Engine**:
  - Direct NT kernel CPU polling with per-core breakdown, base frequency, and hyperthreading topology detection.
  - DirectX Graphics Infrastructure (DXGI) adapter enumeration reporting dedicated and shared GPU memory, driver version, and device ID.
  - Windows IP Helper API (`GetAdaptersAddresses`) querying live Wi-Fi (SSID, 802.11 link speed, RSSI, adapter state) and Ethernet throughput.
  - Windows Disk Management API querying physical drive geometry, partition tables, bus types (NVMe/SATA/USB), and NTFS capacity.
- **Process Management & Tree Inspection**:
  - Real-time process listing with CPU, working set memory, disk I/O, and PID search.
  - Complete hierarchical process tree visualizer tracking parent-child process lineages.
  - Safe process termination, priority adjustments, and affinity controls with NT subsystem guards.
- **Modern Fluent Desktop Shell**:
  - Custom frameless title bar with native Windows minimize, maximize/restore, and close behaviors.
  - High-DPI application icons across all Windows taskbar, start menu, and installer contexts.
  - 3D system topology visualization and adaptive telemetry ring buffers.
- **Engineered Installer & Dependency Isolation**:
  - Bundled Nullsoft (NSIS) 64-bit installer with embedded `WebView2Loader.dll` ensuring zero missing-DLL failures across all Windows 10/11 environments.

---

## 📦 Distribution Artifacts

| Asset | Target Architecture | Size | SHA-256 Checksum |
| :--- | :--- | :--- | :--- |
| **`Snapse-Setup-v1.0.0-x64.exe`** | Windows 10/11 (x86_64) | ~2.57 MiB | `286324A773C0A15FD08984F4C1E5BF7D13A30A9BA8C5A6C7F11F4A04ABCFC7E8` |

### Installation Instructions
1. Download `Snapse-Setup-v1.0.0-x64.exe`.
2. Run the installer (supports both standard interactive GUI installation and silent deployment via `/S`).
3. Launch **Snapse** from the Start Menu or Desktop shortcut.
