import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

os.makedirs('docs/diagrams', exist_ok=True)

plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['font.family'] = 'sans-serif'

def create_diag1():
    fig, ax = plt.subplots(figsize=(11, 7.5), dpi=300)
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 7.5)
    ax.axis('off')

    # Title
    ax.text(5.5, 7.1, "Snapse Windows Desktop Architecture", fontsize=15, fontweight='bold', ha='center', color='#1e293b')
    ax.text(5.5, 6.75, "Dual-Plane Hybrid Architecture: React / Tauri 2 / Rust Native Core / Win32 NT Subsystem", fontsize=9.5, ha='center', color='#64748b')

    # Layer 1: Frontend Presentation
    p1 = patches.FancyBboxPatch((0.5, 4.8), 10.0, 1.7, boxstyle="round,pad=0.1,rounding_size=0.15", ec="#3b82f6", fc="#eff6ff", lw=1.8)
    ax.add_patch(p1)
    ax.text(0.8, 6.2, "PRESENTATION LAYER (React 18 + TypeScript + Vite 5 + Tailwind CSS)", fontsize=10.5, fontweight='bold', color='#1d4ed8')
    
    # Components inside Frontend
    boxes_fe = [
        ("Views: Overview, Performance,\nProcesses, Tree, 3D, Alerts", 0.8, 5.0, 2.8, 0.95),
        ("Custom Title Bar & Controls\n(Native Win32 Minimize/Max/Close)", 3.8, 5.0, 3.2, 0.95),
        ("Three.js System Topology &\nECharts Canvas Telemetry", 7.2, 5.0, 3.1, 0.95)
    ]
    for text, x, y, w, h in boxes_fe:
        b = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#93c5fd", fc="#ffffff", lw=1.2)
        ax.add_patch(b)
        ax.text(x + w/2, y + h/2, text, fontsize=8, ha='center', va='center', color='#1e3a8a')

    # IPC Bridge
    ax.annotate('', xy=(5.5, 4.3), xytext=(5.5, 4.8),
                arrowprops=dict(arrowstyle="<->", color="#0284c7", lw=2.2))
    ax.text(5.5, 4.55, "Asynchronous JSON-RPC IPC (@tauri-apps/api invoke / command handlers)", fontsize=8.5, fontweight='bold', ha='center', va='center',
            bbox=dict(boxstyle="round,pad=0.2", fc="#f0f9ff", ec="#bae6fd", lw=1))

    # Layer 2: Rust Core Engine
    p2 = patches.FancyBboxPatch((0.5, 2.2), 10.0, 2.0, boxstyle="round,pad=0.1,rounding_size=0.15", ec="#d97706", fc="#fffbeb", lw=1.8)
    ax.add_patch(p2)
    ax.text(0.8, 3.9, "CORE MONITORING ENGINE (Native Rust + Tauri 2 Host)", fontsize=10.5, fontweight='bold', color='#b45309')

    boxes_rust = [
        ("MonitoringEngine & Poller\n(RwLock-protected state)", 0.8, 2.4, 2.8, 1.2),
        ("Adaptive Volatility Controller\n(VAC FSM: IDLE/NORMAL/ACTIVE)", 3.8, 2.4, 3.2, 1.2),
        ("History Ring Buffers (300 pts)\n& Sustained Alert Evaluator", 7.2, 2.4, 3.1, 1.2)
    ]
    for text, x, y, w, h in boxes_rust:
        b = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#fcd34d", fc="#ffffff", lw=1.2)
        ax.add_patch(b)
        ax.text(x + w/2, y + h/2, text, fontsize=8, ha='center', va='center', color='#78350f')

    # Kernel Boundary
    ax.annotate('', xy=(5.5, 1.7), xytext=(5.5, 2.2),
                arrowprops=dict(arrowstyle="<->", color="#475569", lw=2.2))
    ax.text(5.5, 1.95, "Native Win32 System Calls & NT Kernel Driver Queries", fontsize=8.5, fontweight='bold', ha='center', va='center',
            bbox=dict(boxstyle="round,pad=0.2", fc="#f8fafc", ec="#cbd5e1", lw=1))

    # Layer 3: Windows OS & Kernel Subsystem
    p3 = patches.FancyBboxPatch((0.5, 0.4), 10.0, 1.2, boxstyle="round,pad=0.1,rounding_size=0.15", ec="#475569", fc="#f1f5f9", lw=1.8)
    ax.add_patch(p3)
    ax.text(0.8, 1.3, "WINDOWS NT OPERATING SYSTEM & HARDWARE SUBSYSTEM", fontsize=10.5, fontweight='bold', color='#334155')

    boxes_os = [
        ("NT Kernel (sysinfo)\nEPROCESS / CPU Times", 0.8, 0.55, 2.2, 0.65),
        ("DXGI 1.1 Factory\nGPU / VRAM / Drivers", 3.2, 0.55, 2.2, 0.65),
        ("IP Helper API\nWi-Fi / Ethernet Adapters", 5.6, 0.55, 2.4, 0.65),
        ("NT Registry / Storage\nPhysical Drive Model & Disk", 8.2, 0.55, 2.1, 0.65)
    ]
    for text, x, y, w, h in boxes_os:
        b = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#94a3b8", fc="#ffffff", lw=1)
        ax.add_patch(b)
        ax.text(x + w/2, y + h/2, text, fontsize=7.5, ha='center', va='center', color='#1e293b')

    plt.tight_layout()
    plt.savefig('docs/diagrams/diag1_overall_architecture.png', dpi=300)
    plt.close()
    print("Generated diag1_overall_architecture.png")

def create_diag2():
    fig, ax = plt.subplots(figsize=(10.5, 6.5), dpi=300)
    ax.set_xlim(0, 10.5)
    ax.set_ylim(0, 6.5)
    ax.axis('off')

    ax.text(5.25, 6.1, "System Metric Collection and Pipeline Flow", fontsize=14, fontweight='bold', ha='center', color='#1e293b')
    ax.text(5.25, 5.75, "Hardware Subsystem Interrogation -> Rust Model Normalization -> UI State Pipeline", fontsize=9, ha='center', color='#64748b')

    # Subsystems on Left
    subsystems = [
        ("CPU Telemetry", "sysinfo::System::refresh_cpu_all()\nIsProcessorFeaturePresent(PF_VIRT)", 0.6, 4.4, "#eff6ff", "#3b82f6"),
        ("Memory Telemetry", "sysinfo physical RAM / available / swap\nWorking set summation", 0.6, 3.2, "#f0fdf4", "#22c55e"),
        ("GPU Telemetry", "Win32 DXGI IDXGIFactory1::EnumAdapters1\nDedicated Video Memory & Registry Drivers", 0.6, 2.0, "#fdf4ff", "#c026d3"),
        ("Disk & Network", "Win32 IP Helper GetAdaptersAddresses\nDisk Enum Registry Key + Volume Capacities", 0.6, 0.8, "#fff7ed", "#ea580c")
    ]

    for title, desc, x, y, bg, border in subsystems:
        p = patches.FancyBboxPatch((x, y), 3.2, 0.95, boxstyle="round,pad=0.08,rounding_size=0.1", ec=border, fc=bg, lw=1.5)
        ax.add_patch(p)
        ax.text(x + 1.6, y + 0.65, title, fontsize=9, fontweight='bold', ha='center', color='#0f172a')
        ax.text(x + 1.6, y + 0.3, desc, fontsize=7, ha='center', color='#334155')
        # Arrow to Engine
        ax.annotate('', xy=(4.6, 2.8), xytext=(3.9, y + 0.48),
                    arrowprops=dict(arrowstyle="->", color=border, lw=1.5))

    # Center: Rust Monitoring Engine
    p_eng = patches.FancyBboxPatch((4.6, 1.5), 2.6, 2.8, boxstyle="round,pad=0.1,rounding_size=0.15", ec="#0284c7", fc="#f0f9ff", lw=2)
    ax.add_patch(p_eng)
    ax.text(5.9, 3.9, "Snapse MonitoringEngine", fontsize=10, fontweight='bold', ha='center', color='#0369a1')
    ax.text(5.9, 3.3, "1. Snapshot Assembly\n(SystemSnapshot Model)", fontsize=8, ha='center', color='#0f172a')
    ax.text(5.9, 2.6, "2. Ring Buffer Push\n(300-point bounded FIFO)", fontsize=8, ha='center', color='#0f172a')
    ax.text(5.9, 1.9, "3. Alert Evaluator\n(Threshold & Duration FSM)", fontsize=8, ha='center', color='#0f172a')

    # Arrow to Frontend
    ax.annotate('', xy=(7.9, 2.8), xytext=(7.3, 2.8),
                arrowprops=dict(arrowstyle="->", color="#0284c7", lw=2.2))
    ax.text(7.6, 3.1, "IPC Invoke", fontsize=7.5, fontweight='bold', ha='center', color='#0284c7')

    # Right: React UI
    p_ui = patches.FancyBboxPatch((7.9, 1.5), 2.2, 2.8, boxstyle="round,pad=0.1,rounding_size=0.15", ec="#10b981", fc="#ecfdf5", lw=2)
    ax.add_patch(p_ui)
    ax.text(9.0, 3.9, "React Frontend", fontsize=10, fontweight='bold', ha='center', color='#047857')
    ax.text(9.0, 3.3, "State Hook Updates\n(useQuery / Polling)", fontsize=8, ha='center', color='#064e3b')
    ax.text(9.0, 2.6, "ECharts Telemetry\nCanvas Render", fontsize=8, ha='center', color='#064e3b')
    ax.text(9.0, 1.9, "Overview Cards &\nPerformance Grids", fontsize=8, ha='center', color='#064e3b')

    plt.tight_layout()
    plt.savefig('docs/diagrams/diag2_metrics_collection.png', dpi=300)
    plt.close()
    print("Generated diag2_metrics_collection.png")

def create_diag3():
    fig, ax = plt.subplots(figsize=(10.5, 6.2), dpi=300)
    ax.set_xlim(0, 10.5)
    ax.set_ylim(0, 6.2)
    ax.axis('off')

    ax.text(5.25, 5.8, "Process Discovery, Hierarchy Assembly & Inspection", fontsize=14, fontweight='bold', ha='center', color='#1e293b')
    ax.text(5.25, 5.45, "Kernel Process Table Iteration -> Parent-Child Graph Construction -> Virtualized UI", fontsize=9, ha='center', color='#64748b')

    steps = [
        ("1. Kernel Traversal", "sysinfo::System::refresh_processes()\nReads active EPROCESS records,\nPIDs, PPIDs, CPU, Memory", 0.6, 3.4, 2.6, 1.6, "#eff6ff", "#3b82f6"),
        ("2. Summary Extraction", "Extract ProcessSummary records:\nPID, Name, Executable Path,\nWorking Set, CPU %, Start Time", 3.8, 3.4, 2.8, 1.6, "#f0fdf4", "#16a34a"),
        ("3. Tree Construction", "Build Parent -> Children Adjacency Map.\nRecursively link ProcessTreeNode.\nRoots = PIDs with missing parents.", 7.1, 3.4, 2.8, 1.6, "#fdf4ff", "#a855f7"),
    ]

    for title, desc, x, y, w, h, bg, border in steps:
        p = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08,rounding_size=0.1", ec=border, fc=bg, lw=1.8)
        ax.add_patch(p)
        ax.text(x + w/2, y + h - 0.35, title, fontsize=9.5, fontweight='bold', ha='center', color='#0f172a')
        ax.text(x + w/2, y + h/2 - 0.2, desc, fontsize=7.8, ha='center', color='#334155')

    # Connect step arrows
    ax.annotate('', xy=(3.7, 4.2), xytext=(3.3, 4.2), arrowprops=dict(arrowstyle="->", color="#64748b", lw=2))
    ax.annotate('', xy=(7.0, 4.2), xytext=(6.7, 4.2), arrowprops=dict(arrowstyle="->", color="#64748b", lw=2))

    # Lower section: Presentation
    p_lower = patches.FancyBboxPatch((0.6, 0.8), 9.3, 1.9, boxstyle="round,pad=0.1,rounding_size=0.15", ec="#d97706", fc="#fffbeb", lw=1.8)
    ax.add_patch(p_lower)
    ax.text(5.25, 2.35, "PRESENTATION LAYER INTERACTION", fontsize=10, fontweight='bold', ha='center', color='#b45309')

    sub_fe = [
        ("Flat Process Manager (ProcessesView)", "Fast sorting by CPU / RAM / Name\nMulti-column filtering & live search", 0.9, 1.0, 4.2, 1.1),
        ("Hierarchical Tree Inspector (ProcessTreeView)", "Expandable lineage branches (Explorer -> App -> Workers)\nImmediate visual attribution of parent sub-trees", 5.4, 1.0, 4.2, 1.1)
    ]
    for title, desc, x, y, w, h in sub_fe:
        b = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#fcd34d", fc="#ffffff", lw=1.2)
        ax.add_patch(b)
        ax.text(x + w/2, y + 0.75, title, fontsize=8.5, fontweight='bold', ha='center', color='#78350f')
        ax.text(x + w/2, y + 0.35, desc, fontsize=7.5, ha='center', color='#451a03')

    # Arrow from upper to lower
    ax.annotate('', xy=(5.25, 2.8), xytext=(5.25, 3.3), arrowprops=dict(arrowstyle="->", color="#64748b", lw=2))

    plt.tight_layout()
    plt.savefig('docs/diagrams/diag3_process_enumeration.png', dpi=300)
    plt.close()
    print("Generated diag3_process_enumeration.png")

def create_diag4():
    fig, ax = plt.subplots(figsize=(10.5, 6.8), dpi=300)
    ax.set_xlim(0, 10.5)
    ax.set_ylim(0, 6.8)
    ax.axis('off')

    ax.text(5.25, 6.4, "Safe Process Closing and Termination Lifecycle", fontsize=14, fontweight='bold', ha='center', color='#1e293b')
    ax.text(5.25, 6.05, "Identity Verification -> Safety Guard Checks -> Dispatched Win32 Action", fontsize=9, ha='center', color='#64748b')

    # Start: User Action
    p_start = patches.FancyBboxPatch((0.6, 4.4), 2.4, 1.2, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#3b82f6", fc="#eff6ff", lw=1.5)
    ax.add_patch(p_start)
    ax.text(1.8, 5.2, "User Process Action", fontsize=9.5, fontweight='bold', ha='center', color='#1d4ed8')
    ax.text(1.8, 4.7, "Terminate (Force) OR\nRequest Close (Graceful)", fontsize=7.5, ha='center', color='#1e40af')

    # Validation Engine
    ax.annotate('', xy=(3.6, 5.0), xytext=(3.1, 5.0), arrowprops=dict(arrowstyle="->", color="#0284c7", lw=2))

    p_val = patches.FancyBboxPatch((3.7, 3.6), 3.4, 2.2, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#f59e0b", fc="#fffbeb", lw=1.8)
    ax.add_patch(p_val)
    ax.text(5.4, 5.4, "validate_process_action()", fontsize=10, fontweight='bold', ha='center', color='#b45309')
    ax.text(5.4, 4.9, "1. Reject PID 0 (System Idle)", fontsize=7.5, ha='center', color='#78350f')
    ax.text(5.4, 4.5, "2. Reject PID 4 (NT Kernel System)", fontsize=7.5, ha='center', color='#78350f')
    ax.text(5.4, 4.1, "3. Reject Snapse Self-PID", fontsize=7.5, ha='center', color='#78350f')
    ax.text(5.4, 3.75, "4. Verify Start Time (PID Recycling Guard)", fontsize=7.5, ha='center', color='#78350f')

    # Branch 1: Fail / Reject
    ax.annotate('', xy=(5.4, 2.7), xytext=(5.4, 3.5), arrowprops=dict(arrowstyle="->", color="#ef4444", lw=2))
    p_fail = patches.FancyBboxPatch((3.7, 1.8), 3.4, 0.8, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#ef4444", fc="#fef2f2", lw=1.5)
    ax.add_patch(p_fail)
    ax.text(5.4, 2.3, "Action Aborted & Error Returned", fontsize=8.5, fontweight='bold', ha='center', color='#b91c1c')
    ax.text(5.4, 1.95, "Safe rejection with explanatory message", fontsize=7.5, ha='center', color='#991b1b')

    # Branch 2: Pass -> Action Dispatch
    ax.annotate('', xy=(7.7, 5.0), xytext=(7.2, 5.0), arrowprops=dict(arrowstyle="->", color="#10b981", lw=2))
    ax.text(7.45, 5.2, "Passed", fontsize=8, fontweight='bold', color="#059669")

    # Graceful Close
    p_close = patches.FancyBboxPatch((7.8, 4.2), 2.3, 1.4, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#0ea5e9", fc="#f0f9ff", lw=1.5)
    ax.add_patch(p_close)
    ax.text(8.95, 5.25, "request_close_process()", fontsize=8.5, fontweight='bold', ha='center', color='#0369a1')
    ax.text(8.95, 4.75, "EnumWindows callback\nMatches HWND to PID\nPostMessageW(WM_CLOSE)", fontsize=7, ha='center', color='#0c4a6e')

    # Force Terminate
    p_term = patches.FancyBboxPatch((7.8, 2.4), 2.3, 1.4, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#dc2626", fc="#fef2f2", lw=1.5)
    ax.add_patch(p_term)
    ax.text(8.95, 3.45, "force_terminate_process()", fontsize=8.5, fontweight='bold', ha='center', color='#b91c1c')
    ax.text(8.95, 2.95, "OpenProcess(TERMINATE)\nTerminateProcess(h, 1)\nCloseHandle(h)", fontsize=7, ha='center', color='#7f1d1d')

    plt.tight_layout()
    plt.savefig('docs/diagrams/diag4_process_safety_lifecycle.png', dpi=300)
    plt.close()
    print("Generated diag4_process_safety_lifecycle.png")

def create_diag5():
    fig, ax = plt.subplots(figsize=(10.5, 6.2), dpi=300)
    ax.set_xlim(0, 10.5)
    ax.set_ylim(0, 6.2)
    ax.axis('off')

    ax.text(5.25, 5.8, "Historical Ring Buffering and Alert Evaluation Engine", fontsize=14, fontweight='bold', ha='center', color='#1e293b')
    ax.text(5.25, 5.45, "Bounded FIFO Buffering -> Sustained Duration Alert FSM -> Settings Persistence", fontsize=9, ha='center', color='#64748b')

    # Telemetry Input
    p_in = patches.FancyBboxPatch((0.5, 3.4), 2.2, 1.4, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#3b82f6", fc="#eff6ff", lw=1.5)
    ax.add_patch(p_in)
    ax.text(1.6, 4.3, "New Telemetry Tick", fontsize=9, fontweight='bold', ha='center', color='#1d4ed8')
    ax.text(1.6, 3.8, "CPU %, Memory Used,\nDisk I/O, Network Bps", fontsize=7.5, ha='center', color='#1e40af')

    # Ring Buffer
    ax.annotate('', xy=(3.3, 4.1), xytext=(2.8, 4.1), arrowprops=dict(arrowstyle="->", color="#0284c7", lw=2))

    p_buf = patches.FancyBboxPatch((3.4, 2.8), 3.2, 2.4, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#8b5cf6", fc="#f5f3ff", lw=1.8)
    ax.add_patch(p_buf)
    ax.text(5.0, 4.8, "HistoryManager Ring Buffers", fontsize=9.5, fontweight='bold', ha='center', color='#6d28d9')
    ax.text(5.0, 4.1, "- System Buffer: 300 points max\n  (Bounded FIFO, auto-evict)", fontsize=7.5, ha='center', color='#4c1d95')
    ax.text(5.0, 3.4, "- Process Buffers: 60 points/PID\n  (Pruned when processes exit)", fontsize=7.5, ha='center', color='#4c1d95')
    ax.text(5.0, 3.0, "- Memory bounds: strictly bounded", fontsize=7.5, ha='center', color='#4c1d95')

    # Alert Evaluator
    ax.annotate('', xy=(7.2, 4.1), xytext=(6.7, 4.1), arrowprops=dict(arrowstyle="->", color="#8b5cf6", lw=2))

    p_alert = patches.FancyBboxPatch((7.3, 2.8), 2.8, 2.4, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#ec4899", fc="#fdf2f8", lw=1.8)
    ax.add_patch(p_alert)
    ax.text(8.7, 4.8, "AlertEvaluator FSM", fontsize=9.5, fontweight='bold', ha='center', color='#be185d')
    ax.text(8.7, 4.2, "Threshold Checks:\nCPU > 80%? Mem > 90%?", fontsize=7.5, ha='center', color='#9d174d')
    ax.text(8.7, 3.6, "Sustained Duration Filter:\nMust persist >= 3.0 seconds", fontsize=7.5, ha='center', color='#9d174d')
    ax.text(8.7, 3.05, "Alert Created & Stored\nUser Acknowledge Support", fontsize=7.5, ha='center', color='#9d174d')

    # Lower Export & Settings
    p_exp = patches.FancyBboxPatch((0.5, 0.8), 9.6, 1.4, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#10b981", fc="#ecfdf5", lw=1.5)
    ax.add_patch(p_exp)
    ax.text(5.3, 1.8, "SETTINGS PERSISTENCE & DATA EXPORT CHANNELS", fontsize=9.5, fontweight='bold', ha='center', color='#047857')
    ax.text(5.3, 1.25, "settings.json (Disk persistence)  |  export_snapshot (JSON Payload)  |  CSV Process & Metrics Stream Export", fontsize=8, ha='center', color='#065f46')

    ax.annotate('', xy=(5.3, 2.3), xytext=(5.3, 2.7), arrowprops=dict(arrowstyle="->", color="#64748b", lw=1.5))

    plt.tight_layout()
    plt.savefig('docs/diagrams/diag5_history_alerts.png', dpi=300)
    plt.close()
    print("Generated diag5_history_alerts.png")

def create_diag6():
    fig, ax = plt.subplots(figsize=(10.5, 6.2), dpi=300)
    ax.set_xlim(0, 10.5)
    ax.set_ylim(0, 6.2)
    ax.axis('off')

    ax.text(5.25, 5.8, "Windows Packaging, NSIS Installer and Native Dependencies", fontsize=14, fontweight='bold', ha='center', color='#1e293b')
    ax.text(5.25, 5.45, "WebView2Loader.dll Packaging Isolation & Clean Deployment Architecture", fontsize=9, ha='center', color='#64748b')

    # Build Stage
    p_build = patches.FancyBboxPatch((0.5, 2.8), 2.8, 2.2, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#3b82f6", fc="#eff6ff", lw=1.5)
    ax.add_patch(p_build)
    ax.text(1.9, 4.6, "Build Pipeline", fontsize=9.5, fontweight='bold', ha='center', color='#1d4ed8')
    ax.text(1.9, 4.1, "- npm run build -> dist/\n- Cargo release build\n- Target: windows-gnullvm\n- LTO & symbol strip", fontsize=7.5, ha='center', color='#1e40af')

    # NSIS Bundle
    ax.annotate('', xy=(3.9, 3.9), xytext=(3.4, 3.9), arrowprops=dict(arrowstyle="->", color="#0284c7", lw=2))

    p_nsis = patches.FancyBboxPatch((4.0, 2.5), 3.4, 2.6, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#f59e0b", fc="#fffbeb", lw=1.8)
    ax.add_patch(p_nsis)
    ax.text(5.7, 4.75, "NSIS Packaging & Hooks", fontsize=9.5, fontweight='bold', ha='center', color='#b45309')
    ax.text(5.7, 4.25, "src-tauri/nsis/hooks.nsh", fontsize=8, fontweight='bold', ha='center', color='#78350f')
    ax.text(5.7, 3.65, "NSIS_HOOK_PREINSTALL:\nCopies WebView2Loader.dll\ndirectly beside snapse.exe into $INSTDIR", fontsize=7.5, ha='center', color='#78350f')
    ax.text(5.7, 2.95, "NSIS_HOOK_POSTUNINSTALL:\nDeletes WebView2Loader.dll cleanly", fontsize=7.5, ha='center', color='#78350f')

    # Output Installer
    ax.annotate('', xy=(8.0, 3.9), xytext=(7.5, 3.9), arrowprops=dict(arrowstyle="->", color="#f59e0b", lw=2))

    p_out = patches.FancyBboxPatch((8.1, 2.8), 2.0, 2.2, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#10b981", fc="#ecfdf5", lw=1.5)
    ax.add_patch(p_out)
    ax.text(9.1, 4.6, "Verified Installer", fontsize=9.5, fontweight='bold', ha='center', color='#047857')
    ax.text(9.1, 3.9, "Snapse-Setup-\nv1.0.0-x64.exe\n~2.57 MiB", fontsize=8, ha='center', color='#065f46')
    ax.text(9.1, 3.2, "Standalone zero-crash\nruntime deployment", fontsize=7.5, ha='center', color='#065f46')

    # Lower: Problem and Fix description
    p_desc = patches.FancyBboxPatch((0.5, 0.6), 9.6, 1.5, boxstyle="round,pad=0.08,rounding_size=0.1", ec="#64748b", fc="#f8fafc", lw=1.2)
    ax.add_patch(p_desc)
    ax.text(5.3, 1.75, "DIAGNOSED PACKAGING DEFECT & ROOT-CAUSE RESOLUTION", fontsize=9, fontweight='bold', ha='center', color='#334155')
    ax.text(5.3, 1.25, "Problem: GNU/LLVM target dynamic linker expects WebView2Loader.dll in the same directory as snapse.exe.\nSolution: Embedded hooks.nsh into Tauri packaging pipeline guarantees automatic DLL placement and uninstallation.", fontsize=7.8, ha='center', color='#475569')

    plt.tight_layout()
    plt.savefig('docs/diagrams/diag6_installer_packaging.png', dpi=300)
    plt.close()
    print("Generated diag6_installer_packaging.png")

if __name__ == '__main__':
    create_diag1()
    create_diag2()
    create_diag3()
    create_diag4()
    create_diag5()
    create_diag6()
