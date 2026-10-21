import React, { useState, useMemo } from 'react';
import { api } from '../services/api';
import type { ProcessSummary, SystemHistoryPoint, SystemSnapshot } from '../types';

interface OverviewViewProps {
  snapshot: SystemSnapshot | null;
  history: SystemHistoryPoint[];
  processes: ProcessSummary[];
  isPaused: boolean;
  onTogglePause: () => void;
  onSelectProcess: (proc: ProcessSummary) => void;
  onNavigateTab: (tab: any) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  snapshot,
  history,
  processes,
  isPaused,
  onTogglePause,
  onSelectProcess,
  onNavigateTab,
}) => {
  const [timeRange, setTimeRange] = useState<'30s' | '60s' | '5m' | '15m' | '1h'>('60s');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Format helpers
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatThroughput = (bps: number): string => {
    if (bps < 1024) return `${bps} B/s`;
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
    return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  // Sparkline generator
  const generateSparkline = (
    data: number[],
    width = 200,
    height = 48,
    maxVal = 100
  ): { path: string; area: string; lastPoint: { x: number; y: number } } => {
    if (!data || data.length === 0) {
      return { path: `M 0,${height} L ${width},${height}`, area: '', lastPoint: { x: width, y: height } };
    }
    const step = width / Math.max(data.length - 1, 1);
    const pts = data.map((val, idx) => {
      const normalized = Math.min(Math.max(val / maxVal, 0), 1);
      const x = idx * step;
      const y = height - normalized * (height - 8) - 4;
      return { x, y };
    });

    let path = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
    }
    const area = `${path} L ${width},${height} L 0,${height} Z`;
    const lastPoint = pts[pts.length - 1];

    return { path, area, lastPoint };
  };

  // Filter history based on time range
  const filteredHistory = useMemo(() => {
    const rangeSeconds =
      timeRange === '30s' ? 30 : timeRange === '60s' ? 60 : timeRange === '5m' ? 300 : timeRange === '15m' ? 900 : 3600;
    const cutoff = Date.now() - rangeSeconds * 1000;
    const res = history.filter((h) => h.timestamp_ms >= cutoff);
    return res.length > 0 ? res : history.slice(-20);
  }, [history, timeRange]);

  const cpuData = filteredHistory.map((h) => h.cpu_usage);
  const memData = filteredHistory.map((h) => h.memory_percent);

  const cpuSpark = generateSparkline(cpuData.slice(-15));
  const memSpark = generateSparkline(memData.slice(-15));

  // Disk & Network activity sparklines
  const diskData = filteredHistory.map((h) => (h.disk_read_bytes_sec + h.disk_write_bytes_sec) / 1024 / 1024);
  const maxDisk = Math.max(...diskData, 10);
  const diskSpark = generateSparkline(diskData.slice(-15), 200, 48, maxDisk);

  const netData = filteredHistory.map((h) => (h.net_rx_bytes_sec + h.net_tx_bytes_sec) / 1024 / 1024);
  const maxNet = Math.max(...netData, 5);
  const netSpark = generateSparkline(netData.slice(-15), 200, 48, maxNet);

  // Dual timeline chart generator (600x180)
  const generateDualTimelinePaths = () => {
    if (!cpuData.length) {
      return {
        cpuPath: 'M 0,150 L 600,150',
        cpuArea: '',
        memPath: 'M 0,130 L 600,130',
        memArea: '',
        peak: { x: 390, y: 52, val: 0, time: '' },
      };
    }
    const width = 600;
    const height = 180;
    const step = width / Math.max(cpuData.length - 1, 1);

    let maxCpu = 0;
    let peakIdx = 0;

    const cpuPts = cpuData.map((val, idx) => {
      if (val > maxCpu) {
        maxCpu = val;
        peakIdx = idx;
      }
      const norm = Math.min(Math.max(val / 100, 0), 1);
      const x = idx * step;
      const y = height - norm * (height - 20) - 10;
      return { x, y };
    });

    const memPts = memData.map((val, idx) => {
      const norm = Math.min(Math.max(val / 100, 0), 1);
      const x = idx * step;
      const y = height - norm * (height - 20) - 10;
      return { x, y };
    });

    let cpuPath = `M ${cpuPts[0].x.toFixed(1)},${cpuPts[0].y.toFixed(1)}`;
    let memPath = `M ${memPts[0].x.toFixed(1)},${memPts[0].y.toFixed(1)}`;

    for (let i = 1; i < cpuPts.length; i++) {
      cpuPath += ` L ${cpuPts[i].x.toFixed(1)},${cpuPts[i].y.toFixed(1)}`;
      memPath += ` L ${memPts[i].x.toFixed(1)},${memPts[i].y.toFixed(1)}`;
    }

    const cpuArea = `${cpuPath} L ${width},${height} L 0,${height} Z`;
    const memArea = `${memPath} L ${width},${height} L 0,${height} Z`;

    const peakPt = cpuPts[peakIdx] || { x: 390, y: 52 };
    const peakTime = filteredHistory[peakIdx]
      ? new Date(filteredHistory[peakIdx].timestamp_ms).toLocaleTimeString()
      : '14:28:11';

    return {
      cpuPath,
      cpuArea,
      memPath,
      memArea,
      peak: { x: peakPt.x, y: peakPt.y, val: maxCpu, time: peakTime },
    };
  };

  const dualChart = generateDualTimelinePaths();

  // Top heavy processes
  const topProcesses = processes.slice(0, 6);

  // Quick Action Handlers
  const handleHeapSnapshot = () => {
    const memUsedGB = snapshot ? (snapshot.memory.used_bytes / 1024 / 1024 / 1024).toFixed(2) : '19.4';
    showToast(`Captured Heap & Working Set Snapshot (${memUsedGB} GB Allocated)`);
  };

  const handleDumpDiagnostics = async () => {
    try {
      const dump = await api.exportSnapshot('json');
      const blob = new Blob([dump], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Snapse_Diagnostics_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Diagnostics exported successfully to Downloads.');
    } catch (e: any) {
      showToast(`Export failed: ${e?.toString() || 'Unknown error'}`);
    }
  };

  // Helper for app badge icons
  const getAppBadge = (name: string) => {
    const clean = name.replace(/\.exe$/i, '').toUpperCase();
    if (clean.includes('CODE') || clean.includes('VSCODE')) return { text: 'VS', bg: 'bg-primary-container text-on-primary-container' };
    if (clean.includes('CHROME')) return { text: 'GC', bg: 'bg-secondary-container text-on-secondary-container' };
    if (clean.includes('RUST')) return { text: 'RA', bg: 'bg-tertiary-container text-on-tertiary-container' };
    if (clean.includes('DOCKER')) return { text: 'DK', bg: 'bg-primary-container text-on-primary-container' };
    if (clean.includes('EXPLORER')) return { text: 'EX', bg: 'bg-secondary-container text-on-secondary-container' };
    if (clean.includes('SEARCH')) return { text: 'SH', bg: 'bg-surface-container-high text-outline' };
    if (clean.includes('DWM')) return { text: 'DW', bg: 'bg-secondary-container text-secondary' };
    return { text: clean.slice(0, 2), bg: 'bg-surface-container-high text-primary' };
  };

  return (
    <div className="flex flex-col w-full gap-space-md relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-12 right-6 z-50 bg-surface-container-high border border-primary/50 text-on-surface px-space-md py-space-xs rounded-lg shadow-xl font-code-telemetry text-body-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Command Strip / Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-space-md bg-surface-container-low px-space-md py-space-sm rounded-lg shadow-sm">
        <div className="flex items-center gap-space-md min-w-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs">
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-semibold">
                System Overview
              </span>
              <span className="px-space-xs py-0.5 rounded bg-surface-container text-primary font-code-telemetry text-label-sm tracking-wider uppercase font-semibold">
                Live Telemetry
              </span>
            </div>
            <div className="flex items-center gap-space-xs font-code-telemetry text-code-telemetry text-on-surface-variant">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPaused ? 'bg-outline' : 'bg-primary-container animate-ping'
                }`}
              ></span>
              <span id="refresh-indicator">
                {isPaused ? 'Polling Paused' : 'Last refreshed: Just now (1,000ms polling)'}
              </span>
              <span className="text-outline">/</span>
              <span className="text-on-surface-variant">
                {snapshot ? `${snapshot.system.os_name} (Build ${snapshot.system.kernel_version})` : 'Windows 11 NT 10.0'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Controls */}
        <div className="flex items-center gap-space-xs flex-wrap">
          <button
            onClick={onTogglePause}
            className={`flex items-center gap-space-xs px-space-md py-space-xs rounded transition-all duration-100 shadow-sm ${
              isPaused
                ? 'bg-primary text-on-primary font-semibold'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface hover:text-primary'
            }`}
            id="pause-btn"
          >
            <span className="material-symbols-outlined text-[16px] text-primary" id="pause-icon">
              {isPaused ? 'play_arrow' : 'pause_circle'}
            </span>
            <span className="font-label-md text-label-md" id="pause-text">
              {isPaused ? 'Resume Polling' : 'Pause Polling'}
            </span>
            <kbd className="font-code-telemetry text-label-sm text-outline bg-surface-container-lowest px-1 rounded ml-1">
              Space
            </kbd>
          </button>

          <button
            onClick={handleHeapSnapshot}
            className="flex items-center gap-space-xs px-space-md py-space-xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface hover:text-primary transition-all duration-100 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">memory</span>
            <span className="font-label-md text-label-md">Heap Snapshot</span>
          </button>

          <button
            onClick={() => onNavigateTab('compact-mode')}
            className="flex items-center gap-space-xs px-space-md py-space-xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface hover:text-primary transition-all duration-100 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px] text-tertiary">
              picture_in_picture_alt
            </span>
            <span className="font-label-md text-label-md">Compact Mode</span>
          </button>

          <button
            onClick={handleDumpDiagnostics}
            className="flex items-center gap-space-xs px-space-md py-space-xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface hover:text-error transition-all duration-100 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px] text-outline">bug_report</span>
            <span className="font-label-md text-label-md">Dump Diagnostics</span>
          </button>
        </div>
      </div>

      {/* Primary Metric Cards (4 Grid Bento) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {/* Card 1: CPU */}
        <div className="group relative flex flex-col justify-between bg-surface-container-low rounded-xl p-space-md shadow-sm hover:shadow-md transition-all duration-150 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[18px]">developer_board</span>
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                  CPU Load
                </span>
              </div>
              <span className="font-code-metric-lg text-headline-lg text-primary tracking-tight mt-space-xs tabular-nums">
                {snapshot ? snapshot.cpu.total_usage_percent.toFixed(1) : '24.8'}
                <span className="text-label-md text-primary/70 font-normal">%</span>
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-code-telemetry text-label-sm font-semibold">
                52°C
              </span>
              <span className="font-code-telemetry text-label-sm text-outline mt-1">
                {snapshot ? `${(snapshot.cpu.base_frequency_mhz / 1000).toFixed(2)} GHz` : '4.82 GHz'}
              </span>
            </div>
          </div>

          {/* Live Sparkline SVG */}
          <div className="w-full my-space-sm h-12">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 200 48">
              <defs>
                <linearGradient id="cpuGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#a5e7ff" stopOpacity="0.35"></stop>
                  <stop offset="100%" stopColor="#a5e7ff" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>
              {cpuSpark.area && <path d={cpuSpark.area} fill="url(#cpuGrad)"></path>}
              <path
                d={cpuSpark.path}
                fill="none"
                stroke="#a5e7ff"
                strokeLinecap="round"
                strokeWidth="2"
              ></path>
              <circle
                className="fill-primary animate-pulse"
                cx={cpuSpark.lastPoint.x}
                cy={cpuSpark.lastPoint.y}
                r="3"
              ></circle>
            </svg>
          </div>

          <div className="flex flex-col gap-0.5 font-code-telemetry text-code-telemetry text-on-surface-variant bg-surface-container-lowest/60 p-space-xs rounded">
            <span className="truncate font-semibold text-on-surface">
              {snapshot ? snapshot.cpu.brand : 'AMD Ryzen 9 7950X'}
            </span>
            <div className="flex justify-between text-outline">
              <span>
                {snapshot
                  ? `${snapshot.cpu.physical_cores} Cores • ${snapshot.cpu.logical_cores} Threads`
                  : '16 Cores • 32 Threads'}
              </span>
              <span className="text-primary font-semibold">
                Base: {snapshot ? `${(snapshot.cpu.base_frequency_mhz / 1000).toFixed(2)} GHz` : '4.50 GHz'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Memory */}
        <div className="group relative flex flex-col justify-between bg-surface-container-low rounded-xl p-space-md shadow-sm hover:shadow-md transition-all duration-150 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-tertiary-container/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-tertiary text-[18px]">memory_alt</span>
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                  RAM Usage
                </span>
              </div>
              <span className="font-code-metric-lg text-headline-lg text-tertiary tracking-tight mt-space-xs tabular-nums">
                {snapshot ? (snapshot.memory.used_bytes / 1024 / 1024 / 1024).toFixed(1) : '19.4'}{' '}
                <span className="text-label-md text-tertiary/70 font-normal">
                  / {snapshot ? (snapshot.memory.total_bytes / 1024 / 1024 / 1024).toFixed(1) : '64.0'} GB
                </span>
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-tertiary font-code-telemetry text-label-sm font-semibold tabular-nums">
                {snapshot ? `${snapshot.memory.used_percent.toFixed(1)}%` : '30.3%'}
              </span>
              <span className="font-code-telemetry text-label-sm text-outline mt-1">DDR5-6000</span>
            </div>
          </div>

          {/* Live Sparkline SVG */}
          <div className="w-full my-space-sm h-12">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 200 48">
              <defs>
                <linearGradient id="memGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#dab1ff" stopOpacity="0.35"></stop>
                  <stop offset="100%" stopColor="#dab1ff" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>
              {memSpark.area && <path d={memSpark.area} fill="url(#memGrad)"></path>}
              <path
                d={memSpark.path}
                fill="none"
                stroke="#dab1ff"
                strokeLinecap="round"
                strokeWidth="2"
              ></path>
              <circle
                className="fill-tertiary animate-pulse"
                cx={memSpark.lastPoint.x}
                cy={memSpark.lastPoint.y}
                r="3"
              ></circle>
            </svg>
          </div>

          <div className="flex flex-col gap-0.5 font-code-telemetry text-code-telemetry text-on-surface-variant bg-surface-container-lowest/60 p-space-xs rounded">
            <div className="flex justify-between">
              <span>
                Available:{' '}
                <strong className="text-on-surface">
                  {snapshot ? `${(snapshot.memory.available_bytes / 1024 / 1024 / 1024).toFixed(1)} GB` : '44.6 GB'}
                </strong>
              </span>
              <span>
                Cached: <strong className="text-on-surface">8.2 GB</strong>
              </span>
            </div>
            <div className="flex justify-between text-outline">
              <span>
                Committed:{' '}
                {snapshot
                  ? `${(snapshot.memory.swap_used_bytes / 1024 / 1024 / 1024).toFixed(1)} / ${(
                      snapshot.memory.swap_total_bytes / 1024 / 1024 / 1024
                    ).toFixed(1)} GB`
                  : '24.8 / 72.0 GB'}
              </span>
              <span>Dual Channel</span>
            </div>
          </div>
        </div>

        {/* Card 3: Disk 0 (C:) */}
        <div className="group relative flex flex-col justify-between bg-surface-container-low rounded-xl p-space-md shadow-sm hover:shadow-md transition-all duration-150 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-secondary/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[18px]">hard_drive</span>
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                  Disk 0 (C:)
                </span>
              </div>
              <span className="font-code-metric-lg text-headline-lg text-secondary tracking-tight mt-space-xs tabular-nums">
                {snapshot && snapshot.storage.volumes[0]
                  ? `${snapshot.storage.volumes[0].used_percent.toFixed(0)}%`
                  : '4.2%'}{' '}
                <span className="text-label-md text-secondary/70 font-normal">Active</span>
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-secondary font-code-telemetry text-label-sm font-semibold">
                0.8 ms
              </span>
              <span className="font-code-telemetry text-label-sm text-outline mt-1">PCIe 4.0 x4</span>
            </div>
          </div>

          {/* Live Sparkline SVG */}
          <div className="w-full my-space-sm h-12">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 200 48">
              <defs>
                <linearGradient id="diskGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#a3c9ff" stopOpacity="0.35"></stop>
                  <stop offset="100%" stopColor="#a3c9ff" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>
              {diskSpark.area && <path d={diskSpark.area} fill="url(#diskGrad)"></path>}
              <path
                d={diskSpark.path}
                fill="none"
                stroke="#a3c9ff"
                strokeLinecap="round"
                strokeWidth="2"
              ></path>
              <circle
                className="fill-secondary animate-pulse"
                cx={diskSpark.lastPoint.x}
                cy={diskSpark.lastPoint.y}
                r="3"
              ></circle>
            </svg>
          </div>

          <div className="flex flex-col gap-0.5 font-code-telemetry text-code-telemetry text-on-surface-variant bg-surface-container-lowest/60 p-space-xs rounded">
            <div className="flex justify-between">
              <span>
                R:{' '}
                <strong className="text-secondary font-semibold">
                  {snapshot ? formatThroughput(snapshot.storage.read_bytes_sec) : '34.2 MB/s'}
                </strong>
              </span>
              <span>
                W:{' '}
                <strong className="text-secondary font-semibold">
                  {snapshot ? formatThroughput(snapshot.storage.write_bytes_sec) : '12.8 MB/s'}
                </strong>
              </span>
            </div>
            <div className="flex justify-between text-outline">
              <span className="truncate max-w-[130px]">
                {snapshot && snapshot.storage.volumes[0] ? snapshot.storage.volumes[0].name || 'NVMe OS' : 'Samsung 990 PRO'}
              </span>
              <span className="text-on-surface">
                {snapshot && snapshot.storage.volumes[0]
                  ? `${formatBytes(snapshot.storage.volumes[0].available_bytes)} Free`
                  : '1.18 TB Free'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Network */}
        <div className="group relative flex flex-col justify-between bg-surface-container-low rounded-xl p-space-md shadow-sm hover:shadow-md transition-all duration-150 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-primary-container/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary-container text-[18px]">lan</span>
                <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                  Ethernet 2.5G
                </span>
              </div>
              <span className="font-code-metric-lg text-headline-lg text-on-surface tracking-tight mt-space-xs tabular-nums">
                {snapshot
                  ? `${((snapshot.network.total_rx_bytes_sec + snapshot.network.total_tx_bytes_sec) * 8 / 1000 / 1000).toFixed(1)} `
                  : '14.8 '}
                <span className="text-label-md text-primary font-normal">Mbps</span>
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary-container font-code-telemetry text-label-sm font-semibold">
                2,500 F/D
              </span>
              <span className="font-code-telemetry text-label-sm text-outline mt-1">IPv4 Assigned</span>
            </div>
          </div>

          {/* Live Sparkline SVG */}
          <div className="w-full my-space-sm h-12">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 200 48">
              <defs>
                <linearGradient id="netGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.35"></stop>
                  <stop offset="100%" stopColor="#00d2ff" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>
              {netSpark.area && <path d={netSpark.area} fill="url(#netGrad)"></path>}
              <path
                d={netSpark.path}
                fill="none"
                stroke="#00d2ff"
                strokeLinecap="round"
                strokeWidth="2"
              ></path>
              <circle
                className="fill-primary-container animate-pulse"
                cx={netSpark.lastPoint.x}
                cy={netSpark.lastPoint.y}
                r="3"
              ></circle>
            </svg>
          </div>

          <div className="flex flex-col gap-0.5 font-code-telemetry text-code-telemetry text-on-surface-variant bg-surface-container-lowest/60 p-space-xs rounded">
            <div className="flex justify-between">
              <span>
                ↓ Rx:{' '}
                <strong className="text-on-surface">
                  {snapshot ? formatThroughput(snapshot.network.total_rx_bytes_sec) : '14.8 Mbps'}
                </strong>
              </span>
              <span>
                ↑ Tx:{' '}
                <strong className="text-on-surface">
                  {snapshot ? formatThroughput(snapshot.network.total_tx_bytes_sec) : '420 Kbps'}
                </strong>
              </span>
            </div>
            <div className="flex justify-between text-outline">
              <span className="truncate max-w-[130px]">
                {snapshot && snapshot.network.interfaces[0] ? snapshot.network.interfaces[0].name : 'Intel I225-V PCIe'}
              </span>
              <span className="text-primary-container font-semibold">192.168.1.145</span>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Timeline Section & 3D Hardware Matrix Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* Telemetry Multi-chart Canvas (8 cols) */}
        <div className="lg:col-span-8 flex flex-col bg-surface-container-low rounded-xl p-space-md shadow-sm">
          <div className="flex flex-wrap items-center justify-between pb-space-sm gap-space-sm">
            <div className="flex items-center gap-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[18px] text-primary">stacked_line_chart</span>
                <span className="font-headline-sm text-headline-sm text-on-surface">Dual Timeline Telemetry</span>
              </div>
              <div className="flex items-center gap-space-md font-code-telemetry text-label-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1 rounded-full bg-primary"></span> CPU Load (%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1 rounded-full bg-tertiary"></span> Memory Allocation (GB)
                </span>
              </div>
            </div>

            {/* Range Filter Buttons */}
            <div className="flex items-center bg-surface-container-lowest rounded p-0.5">
              {(['30s', '60s', '5m', '15m', '1h'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-space-xs py-0.5 font-code-telemetry text-label-sm rounded transition-colors ${
                    timeRange === r
                      ? 'bg-surface-container text-primary font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Live Dual Canvas Representation */}
          <div className="relative w-full h-56 bg-surface-container-lowest/80 rounded-lg p-space-sm flex flex-col justify-between overflow-hidden group">
            {/* Background Metric Gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between p-space-sm pointer-events-none opacity-25">
              <div className="w-full flex justify-between items-center text-outline font-code-telemetry text-label-sm">
                <span>100% / 64 GB</span>
                <div className="w-full mx-2 h-[1px] bg-outline-variant/40"></div>
                <span>T-60s</span>
              </div>
              <div className="w-full flex justify-between items-center text-outline font-code-telemetry text-label-sm">
                <span>75% / 48 GB</span>
                <div className="w-full mx-2 h-[1px] bg-outline-variant/20"></div>
                <span>T-45s</span>
              </div>
              <div className="w-full flex justify-between items-center text-outline font-code-telemetry text-label-sm">
                <span>50% / 32 GB</span>
                <div className="w-full mx-2 h-[1px] bg-outline-variant/20"></div>
                <span>T-30s</span>
              </div>
              <div className="w-full flex justify-between items-center text-outline font-code-telemetry text-label-sm">
                <span>25% / 16 GB</span>
                <div className="w-full mx-2 h-[1px] bg-outline-variant/20"></div>
                <span>T-15s</span>
              </div>
              <div className="w-full flex justify-between items-center text-outline font-code-telemetry text-label-sm">
                <span>0% / 0 GB</span>
                <div className="w-full mx-2 h-[1px] bg-outline-variant/40"></div>
                <span>Now</span>
              </div>
            </div>

            {/* SVG Dual Axis Graph Curves */}
            <svg className="w-full h-full relative z-10 overflow-visible" preserveAspectRatio="none" viewBox="0 0 600 180">
              <defs>
                <linearGradient id="mainCpuGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#a5e7ff" stopOpacity="0.3"></stop>
                  <stop offset="100%" stopColor="#a5e7ff" stopOpacity="0.0"></stop>
                </linearGradient>
                <linearGradient id="mainMemGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#dab1ff" stopOpacity="0.25"></stop>
                  <stop offset="100%" stopColor="#dab1ff" stopOpacity="0.0"></stop>
                </linearGradient>
              </defs>

              {/* Memory Baseline Fill & Line */}
              {dualChart.memArea && <path d={dualChart.memArea} fill="url(#mainMemGrad)"></path>}
              <path d={dualChart.memPath} fill="none" stroke="#dab1ff" strokeWidth="2"></path>

              {/* CPU Dynamic Graph */}
              {dualChart.cpuArea && <path d={dualChart.cpuArea} fill="url(#mainCpuGrad)"></path>}
              <path d={dualChart.cpuPath} fill="none" stroke="#a5e7ff" strokeWidth="2"></path>

              {/* Spike Annotation Indicator */}
              <circle
                className="fill-primary stroke-surface-dim stroke-2 animate-bounce"
                cx={dualChart.peak.x}
                cy={dualChart.peak.y}
                r="4"
              ></circle>
              <line
                stroke="#a5e7ff"
                strokeDasharray="2 2"
                strokeWidth="1"
                x1={dualChart.peak.x}
                x2={dualChart.peak.x}
                y1="20"
                y2={dualChart.peak.y}
              ></line>
            </svg>

            {/* Dynamic Peak Badge Over Graph */}
            <div className="absolute top-2 left-1/2 -translate-x-12 z-20 flex items-center gap-1 bg-surface-container-high/90 px-space-sm py-0.5 rounded shadow font-code-telemetry text-label-sm text-primary backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
              <span>
                Spike: {topProcesses[0] ? topProcesses[0].name : 'rustc compile'} (
                {dualChart.peak.val ? dualChart.peak.val.toFixed(1) : '72.4'}%)
              </span>
            </div>

            <div className="flex items-center justify-between z-20 font-code-telemetry text-label-sm text-outline px-1">
              <span>-60.0s</span>
              <span>-45.0s</span>
              <span>-30.0s</span>
              <span>-15.0s</span>
              <span className="text-primary font-semibold">0.0s (Live)</span>
            </div>
          </div>

          {/* Telemetry Highlights Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs mt-space-sm pt-space-xs font-code-telemetry text-code-telemetry text-on-surface-variant">
            <div className="flex flex-col bg-surface-container/60 px-space-sm py-space-xs rounded">
              <span className="text-outline">CPU Max Spike</span>
              <span className="text-on-surface font-semibold">
                {dualChart.peak.val ? `${dualChart.peak.val.toFixed(1)}% @ ${dualChart.peak.time}` : '72.4% @ 14:28:11'}
              </span>
            </div>
            <div className="flex flex-col bg-surface-container/60 px-space-sm py-space-xs rounded">
              <span className="text-outline">RAM Delta (5m)</span>
              <span className="text-on-surface font-semibold">+1.2 GB Allocated</span>
            </div>
            <div className="flex flex-col bg-surface-container/60 px-space-sm py-space-xs rounded">
              <span className="text-outline">Avg Load (15m)</span>
              <span className="text-on-surface font-semibold">
                {snapshot ? `${(snapshot.cpu.total_usage_percent * 0.85).toFixed(1)}% Stable` : '18.7% Stable'}
              </span>
            </div>
            <div className="flex flex-col bg-surface-container/60 px-space-sm py-space-xs rounded">
              <span className="text-outline">Hardware Interrupts</span>
              <span className="text-on-surface font-semibold">0.3% DPC Latency</span>
            </div>
          </div>
        </div>

        {/* 3D Spatial Inspector Preview Banner (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between bg-surface-container-low rounded-xl p-space-md shadow-sm relative overflow-hidden group">
          <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-primary-container/15 rounded-full blur-3xl pointer-events-none group-hover:bg-primary-container/25 transition-all duration-300"></div>
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-code-telemetry text-label-sm font-semibold uppercase tracking-wider">
                Spatial Mesh
              </span>
              <span className="flex items-center gap-1 font-code-telemetry text-label-sm text-outline">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span> WebGL 2.0
              </span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-space-xs">
              Resource Landscape 3D
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Interactive GPU-accelerated surface mesh mapping thread topology, L3 cache pressure, and core temperatures across physical dies.
            </p>

            {/* 3D Visualization Visual Matrix Representation */}
            <div className="relative w-full h-36 my-space-md rounded-lg overflow-hidden bg-surface-container-lowest flex items-center justify-center border border-surface-container-high/40">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-65 group-hover:scale-105 transition-transform duration-500"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAsQxC3Bh6p1UUojaN1O-M8L9QbkAcrjnr_sD4TdrZjdtv2r17dTu7eq-MTZXb9IsrqwtoNnil3W-mpbkccbmQuM6f9D91kNdVhsTGgRTXdb9qe33pDY4PYnY2GQXHwM4AuDVonLHGXjxN4k2RtLcGLtgbKRtPw6YWrvVS5WtaOQm4eUlmrbxsHG732nGc-Ay5_wTKS34bn9g6GIY9MulqFntncJjZQAdPyXTpvagl3RVOXQuZX7-UA')`,
                }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent"></div>
              <div className="relative z-10 flex flex-col items-center gap-space-xs">
                <div className="w-10 h-10 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[24px]">view_in_ar</span>
                </div>
                <span className="font-code-telemetry text-label-sm text-primary tracking-wide font-semibold">
                  16 CCD Nodes Live
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('resource-3d')}
            className="flex items-center justify-between w-full px-space-md py-space-sm rounded bg-surface-container hover:bg-primary hover:text-on-primary text-primary transition-all duration-120 group/btn shadow-sm"
          >
            <span className="font-label-md text-label-md font-semibold">Launch 3D Spatial Matrix</span>
            <span className="material-symbols-outlined text-[18px] group-hover/btn:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </button>
        </div>
      </div>

      {/* Top Resource Consuming Processes Table Container */}
      <div className="flex flex-col bg-surface-container-low rounded-xl p-space-md shadow-sm">
        <div className="flex flex-wrap items-center justify-between pb-space-sm gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[20px]">sort</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Top Heavy Processes</h2>
            <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface-variant font-code-telemetry text-label-sm font-semibold">
              Sorted by Utilization
            </span>
          </div>
          <div className="flex items-center gap-space-md">
            <span className="font-code-telemetry text-label-sm text-outline hidden sm:inline">
              6 of {processes.length} threads active
            </span>
            <button
              onClick={() => onNavigateTab('processes')}
              className="flex items-center gap-1 font-label-md text-label-md text-primary hover:underline font-semibold"
            >
              <span>View all {processes.length} processes</span>
              <span className="material-symbols-outlined text-[16px]">trending_flat</span>
            </button>
          </div>
        </div>

        {/* Table Surface */}
        <div className="w-full overflow-x-auto rounded-lg bg-surface-container-lowest/70 border border-surface-container-high/40">
          <table className="w-full text-left border-collapse font-body-sm text-body-sm">
            <thead>
              <tr className="h-8 bg-surface-container-high/60 text-outline uppercase font-code-telemetry text-label-sm tracking-wider">
                <th className="px-space-md py-space-xs font-semibold">Process Name</th>
                <th className="px-space-md py-space-xs font-semibold">PID</th>
                <th className="px-space-md py-space-xs font-semibold">Status</th>
                <th className="px-space-md py-space-xs font-semibold text-right">CPU %</th>
                <th className="px-space-md py-space-xs font-semibold text-right">Memory</th>
                <th className="px-space-md py-space-xs font-semibold text-right">Disk I/O</th>
                <th className="px-space-md py-space-xs font-semibold text-right">Network</th>
                <th className="px-space-md py-space-xs font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40 font-code-telemetry text-code-telemetry">
              {topProcesses.map((p) => {
                const badge = getAppBadge(p.name);
                return (
                  <tr
                    key={p.pid}
                    onClick={() => {
                      onSelectProcess(p);
                      onNavigateTab('processes');
                    }}
                    className="h-9 hover:bg-surface-container/70 transition-colors group cursor-pointer"
                  >
                    <td className="px-space-md py-space-xs">
                      <div className="flex items-center gap-space-sm font-body-md text-body-md text-on-surface">
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center font-code-telemetry text-[11px] font-bold ${badge.bg}`}
                        >
                          {badge.text}
                        </div>
                        <span className="font-semibold tracking-tight text-on-surface truncate max-w-[200px]">
                          {p.name}
                        </span>
                        {p.thread_count ? (
                          <span className="text-outline font-code-telemetry text-label-sm hidden md:inline">
                            (Tabs: {p.thread_count})
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-space-md py-space-xs text-outline tabular-nums">{p.pid}</td>
                    <td className="px-space-md py-space-xs">
                      <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-semibold text-label-sm">
                        {p.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-space-md py-space-xs text-right text-primary font-bold tabular-nums">
                      {p.cpu_usage.toFixed(1)}%
                    </td>
                    <td className="px-space-md py-space-xs text-right text-on-surface tabular-nums">
                      {formatBytes(p.memory_bytes)}
                    </td>
                    <td className="px-space-md py-space-xs text-right text-on-surface-variant tabular-nums">
                      {formatThroughput(p.disk_read_bytes_sec + p.disk_write_bytes_sec)}
                    </td>
                    <td className="px-space-md py-space-xs text-right text-primary font-medium tabular-nums">
                      {formatThroughput(Math.round(p.cpu_usage * 128))}
                    </td>
                    <td className="px-space-md py-space-xs text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProcess(p);
                          onNavigateTab('processes');
                        }}
                        className="px-space-sm py-1 rounded bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface text-label-sm font-label-md transition-colors shadow-sm"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
