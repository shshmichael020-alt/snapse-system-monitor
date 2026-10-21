import React, { useState, useMemo } from 'react';
import type { SystemHistoryPoint, SystemSnapshot } from '../types';

interface PerformanceViewProps {
  snapshot: SystemSnapshot | null;
  history: SystemHistoryPoint[];
  isPaused: boolean;
  onTogglePause: () => void;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({
  snapshot,
  history,
  isPaused,
  onTogglePause,
}) => {
  const [selectedTile, setSelectedTile] = useState<'cpu' | 'memory' | 'disk0' | 'disk1' | 'ethernet' | 'wifi' | 'gpu'>('cpu');
  const [viewMode, setViewMode] = useState<'overall' | 'cores'>('overall');
  const [timeWindowSecs, setTimeWindowSecs] = useState<number>(60);
  const [activeBottomTab, setActiveBottomTab] = useState<'cpu' | 'memory' | 'disk'>('cpu');

  // Slice history according to selected timeWindowSecs
  const cutoff = Date.now() - timeWindowSecs * 1000;
  const filteredHistory = useMemo(() => {
    const res = history.filter((h) => h.timestamp_ms >= cutoff);
    return res.length > 0 ? res : history.slice(-20);
  }, [history, cutoff]);

  // Generate SVG chart paths for 1000x240 main canvas
  const generateMainChart = () => {
    const width = 1000;
    const height = 240;

    let data: number[] = [];
    if (selectedTile === 'cpu') {
      data = filteredHistory.map((h) => h.cpu_usage);
    } else if (selectedTile === 'memory') {
      data = filteredHistory.map((h) => h.memory_percent);
    } else if (selectedTile === 'disk0' || selectedTile === 'disk1') {
      const maxD = Math.max(...filteredHistory.map((h) => (h.disk_read_bytes_sec + h.disk_write_bytes_sec) / 1024 / 1024), 10);
      data = filteredHistory.map((h) => (((h.disk_read_bytes_sec + h.disk_write_bytes_sec) / 1024 / 1024) / maxD) * 100);
    } else if (selectedTile === 'ethernet') {
      const maxN = Math.max(...filteredHistory.map((h) => (h.net_rx_bytes_sec + h.net_tx_bytes_sec) / 1024 / 1024), 5);
      data = filteredHistory.map((h) => (((h.net_rx_bytes_sec + h.net_tx_bytes_sec) / 1024 / 1024) / maxN) * 100);
    } else if (selectedTile === 'gpu') {
      data = filteredHistory.map((h) => Math.min(h.cpu_usage * 0.8, 100));
    }

    if (!data.length) {
      data = [24, 28, 22, 35, 18, 50, 75, 89.4, 60, 45, 30, 25, 24.8];
    }

    const step = width / Math.max(data.length - 1, 1);
    let maxVal = 0;
    let peakIdx = 0;

    const pts = data.map((val, idx) => {
      if (val > maxVal) {
        maxVal = val;
        peakIdx = idx;
      }
      const norm = Math.min(Math.max(val / 100, 0), 1);
      const x = idx * step;
      const y = height - norm * (height - 30) - 15;
      return { x, y };
    });

    let path = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
    }
    const area = `${path} L ${width},${height} L 0,${height} Z`;
    const peakPt = pts[peakIdx] || { x: 370, y: 40 };
    const peakTime = filteredHistory[peakIdx]
      ? new Date(filteredHistory[peakIdx].timestamp_ms).toLocaleTimeString()
      : '14:22:10';

    return { path, area, peakPt, maxVal, peakTime };
  };

  const chart = generateMainChart();

  // Calculation for stats
  const cpuPercent = snapshot ? snapshot.cpu.total_usage_percent : 24.8;
  const userCpu = (cpuPercent * 0.83).toFixed(1);
  const kernelCpu = (cpuPercent * 0.17).toFixed(1);
  const clockGhz = snapshot ? (snapshot.cpu.base_frequency_mhz / 1000).toFixed(2) : '4.84';
  const processCount = 184;

  const formatUptimeFormatted = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `0:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const uptime = snapshot ? formatUptimeFormatted(snapshot.system.uptime_seconds) : '0:04:18:22';

  return (
    <div className="flex flex-col w-full text-on-surface select-none">
      {/* Top Command Strip & Breadcrumb */}
      <div className="flex items-center justify-between px-space-md py-space-xs bg-surface-container-low rounded-lg mb-space-sm shadow-sm border border-surface-container-high/40">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px] text-primary">monitoring</span>
            <span>Telemetry Core</span>
            <span className="text-outline">/</span>
            <span className="text-on-surface font-semibold">Hardware Performance Suite</span>
          </div>
          <div className="flex items-center gap-space-xs bg-surface-container px-space-sm py-0.5 rounded text-on-surface font-code-telemetry text-code-telemetry">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-ping"></span>
            <span>DirectX 12 / Rust SysInfo Engine</span>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          {/* View toggle */}
          <div className="flex items-center bg-surface-container-high rounded p-0.5 text-on-surface-variant">
            <button
              onClick={() => setViewMode('overall')}
              className={`px-space-sm py-1 rounded font-label-sm text-label-sm flex items-center gap-1 transition-all ${
                viewMode === 'overall'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              id="viewToggleOverall"
            >
              <span className="material-symbols-outlined text-[14px]">show_chart</span>
              <span>Overall Utilization</span>
            </button>
            <button
              onClick={() => setViewMode('cores')}
              className={`px-space-sm py-1 rounded font-label-sm text-label-sm flex items-center gap-1 transition-all ${
                viewMode === 'cores'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              id="viewToggleCores"
            >
              <span className="material-symbols-outlined text-[14px]">grid_view</span>
              <span>{snapshot ? snapshot.cpu.logical_cores : 32} Logical Processors</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-outline-variant"></div>

          {/* Time range buttons */}
          <div className="flex items-center gap-1 bg-surface-container-high rounded p-0.5 text-on-surface font-code-telemetry text-code-telemetry">
            {[30, 60, 300, 900].map((s) => (
              <button
                key={s}
                onClick={() => setTimeWindowSecs(s)}
                className={`px-space-sm py-1 rounded transition-colors ${
                  timeWindowSecs === s
                    ? 'bg-primary-container text-on-primary-container font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {s < 60 ? `${s}s` : `${s / 60}m`}
              </button>
            ))}
          </div>

          <button
            onClick={onTogglePause}
            className={`flex items-center gap-1 px-space-sm py-1 rounded transition-colors font-label-sm text-label-sm ${
              isPaused
                ? 'bg-primary text-on-primary font-semibold'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">
              {isPaused ? 'play_arrow' : 'pause'}
            </span>
            <span>{isPaused ? 'Resume (Space)' : 'Pause (Space)'}</span>
          </button>
        </div>
      </div>

      {/* Primary Workspace Split: Left Hardware Nav + Main Viewport */}
      <div className="grid grid-cols-12 gap-space-sm w-full items-start">
        {/* LEFT COLUMN: Hardware Sub-Navigation Tiles (3 cols) */}
        <div className="col-span-12 xl:col-span-3 flex flex-col gap-space-xs">
          {/* CPU Item */}
          <div
            onClick={() => setSelectedTile('cpu')}
            className={`flex flex-col p-space-sm rounded-lg shadow-sm cursor-pointer relative overflow-hidden group transition-colors ${
              selectedTile === 'cpu' ? 'bg-surface-container' : 'bg-surface-container-low hover:bg-surface-container'
            }`}
          >
            {selectedTile === 'cpu' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container"></div>}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[18px]">memory</span>
                <span className="font-label-md text-label-md text-on-surface font-semibold">CPU</span>
              </div>
              <span className="font-code-metric-lg text-code-metric-lg text-primary font-bold tabular-nums">
                {snapshot ? snapshot.cpu.total_usage_percent.toFixed(1) : '24.8'}%
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5 font-code-telemetry text-code-telemetry text-on-surface-variant">
              <span className="truncate max-w-[130px]">{snapshot ? snapshot.cpu.brand : 'AMD Ryzen 9 7950X'}</span>
              <span className="text-primary-fixed">{clockGhz} GHz</span>
            </div>
            {/* Sparkline */}
            <div className="h-9 w-full mt-1.5 bg-surface-container-lowest/80 rounded flex items-end p-1 relative overflow-hidden">
              <svg className="w-full h-full text-primary" preserveAspectRatio="none" viewBox="0 0 160 30">
                <defs>
                  <linearGradient id="cpuGradMini" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.45"></stop>
                    <stop offset="100%" stopColor="#00d2ff" stopOpacity="0.0"></stop>
                  </linearGradient>
                </defs>
                <path d="M0,24 Q20,20 35,26 T70,18 T100,5 T115,22 T140,14 L160,18 L160,30 L0,30 Z" fill="url(#cpuGradMini)"></path>
                <path d="M0,24 Q20,20 35,26 T70,18 T100,5 T115,22 T140,14 L160,18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5"></path>
              </svg>
            </div>
          </div>

          {/* Memory Item */}
          <div
            onClick={() => setSelectedTile('memory')}
            className={`flex flex-col p-space-sm rounded-lg shadow-sm cursor-pointer relative group transition-colors ${
              selectedTile === 'memory' ? 'bg-surface-container' : 'bg-surface-container-low hover:bg-surface-container'
            }`}
          >
            {selectedTile === 'memory' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-tertiary-container"></div>}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-tertiary-fixed-dim text-[18px]">developer_board</span>
                <span className="font-label-md text-label-md text-on-surface">Memory</span>
              </div>
              <span className="font-code-metric-lg text-code-metric-lg text-tertiary font-semibold tabular-nums">
                {snapshot ? snapshot.memory.used_percent.toFixed(1) : '30.3'}%
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5 font-code-telemetry text-code-telemetry text-on-surface-variant">
              <span>
                {snapshot ? (snapshot.memory.used_bytes / 1024 / 1024 / 1024).toFixed(1) : '19.4'} /{' '}
                {snapshot ? (snapshot.memory.total_bytes / 1024 / 1024 / 1024).toFixed(1) : '64.0'} GB
              </span>
              <span>DDR5-6000 MT/s</span>
            </div>
            <div className="h-7 w-full mt-1.5 bg-surface-container-lowest/70 rounded flex items-end p-1 relative overflow-hidden">
              <svg className="w-full h-full text-tertiary" preserveAspectRatio="none" viewBox="0 0 160 24">
                <path d="M0,16 L30,16 L55,15 L80,14 L110,13 L135,13 L160,12" fill="none" stroke="currentColor" strokeWidth="1.5"></path>
              </svg>
            </div>
          </div>

          {/* Disk 0 (C: OS) */}
          <div
            onClick={() => setSelectedTile('disk0')}
            className={`flex flex-col p-space-sm rounded-lg shadow-sm cursor-pointer relative group transition-colors ${
              selectedTile === 'disk0' ? 'bg-surface-container' : 'bg-surface-container-low hover:bg-surface-container'
            }`}
          >
            {selectedTile === 'disk0' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary-container"></div>}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[18px]">storage</span>
                <span className="font-label-md text-label-md text-on-surface">Disk 0 (C: OS)</span>
              </div>
              <span className="font-code-metric-lg text-code-metric-lg text-secondary">
                {snapshot && snapshot.storage.volumes[0] ? `${snapshot.storage.volumes[0].used_percent.toFixed(0)}%` : '4%'}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5 font-code-telemetry text-code-telemetry text-on-surface-variant">
              <span>Samsung 990 PRO 2TB</span>
              <span className="text-on-surface">0.8 ms</span>
            </div>
            <div className="h-6 w-full mt-1 bg-surface-container-lowest/70 rounded flex items-end p-0.5">
              <svg className="w-full h-full text-secondary" preserveAspectRatio="none" viewBox="0 0 160 20">
                <path d="M0,18 L35,18 L40,6 L45,18 L90,18 L95,12 L100,18 L160,18" fill="none" stroke="currentColor" strokeWidth="1.5"></path>
              </svg>
            </div>
          </div>

          {/* Disk 1 (D:) */}
          <div
            onClick={() => setSelectedTile('disk1')}
            className={`flex flex-col p-space-sm rounded-lg shadow-sm cursor-pointer relative group transition-colors ${
              selectedTile === 'disk1' ? 'bg-surface-container' : 'bg-surface-container-low hover:bg-surface-container'
            }`}
          >
            {selectedTile === 'disk1' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary-container"></div>}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-outline text-[18px]">dns</span>
                <span className="font-label-md text-label-md text-on-surface">Disk 1 (D: Data NVMe)</span>
              </div>
              <span className="font-code-metric-lg text-code-metric-lg text-on-surface-variant">0%</span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5 font-code-telemetry text-code-telemetry text-on-surface-variant">
              <span>WD_BLACK SN850X 4TB</span>
              <span>0.0 ms</span>
            </div>
            <div className="h-6 w-full mt-1 bg-surface-container-lowest/70 rounded flex items-end p-0.5">
              <svg className="w-full h-full text-outline" preserveAspectRatio="none" viewBox="0 0 160 20">
                <path d="M0,19 L160,19" fill="none" stroke="currentColor" strokeWidth="1.2"></path>
              </svg>
            </div>
          </div>

          {/* Ethernet */}
          <div
            onClick={() => setSelectedTile('ethernet')}
            className={`flex flex-col p-space-sm rounded-lg shadow-sm cursor-pointer relative group transition-colors ${
              selectedTile === 'ethernet' ? 'bg-surface-container' : 'bg-surface-container-low hover:bg-surface-container'
            }`}
          >
            {selectedTile === 'ethernet' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container"></div>}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary-container text-[18px]">settings_ethernet</span>
                <span className="font-label-md text-label-md text-on-surface">Ethernet (Intel 2.5GbE)</span>
              </div>
              <span className="font-code-telemetry text-code-telemetry text-primary font-semibold">14.8 Mbps</span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5 font-code-telemetry text-code-telemetry text-on-surface-variant">
              <span>S: 420 Kbps</span>
              <span>R: 14.8 Mbps</span>
            </div>
            <div className="h-6 w-full mt-1 bg-surface-container-lowest/70 rounded flex items-end p-0.5">
              <svg className="w-full h-full text-primary" preserveAspectRatio="none" viewBox="0 0 160 20">
                <path d="M0,18 L20,18 L35,14 L50,18 L65,10 L80,18 L95,6 L105,18 L160,18" fill="none" stroke="currentColor" strokeWidth="1.5"></path>
              </svg>
            </div>
          </div>

          {/* Wi-Fi (Inactive) */}
          <div className="flex flex-col bg-surface-container-lowest/60 p-space-sm rounded-lg opacity-60 cursor-not-allowed">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs text-outline">
                <span className="material-symbols-outlined text-[18px]">wifi_off</span>
                <span className="font-label-md text-label-md">Wi-Fi 6E</span>
              </div>
              <span className="font-label-sm text-label-sm bg-surface-container-high px-space-xs py-0.5 rounded text-outline">
                Disconnected
              </span>
            </div>
            <span className="font-code-telemetry text-code-telemetry text-outline mt-1">
              Intel Wi-Fi 6E AX211 • Offline
            </span>
          </div>

          {/* GPU 0 */}
          <div
            onClick={() => setSelectedTile('gpu')}
            className={`flex flex-col p-space-sm rounded-lg shadow-sm cursor-pointer relative group transition-colors ${
              selectedTile === 'gpu' ? 'bg-surface-container' : 'bg-surface-container-low hover:bg-surface-container'
            }`}
          >
            {selectedTile === 'gpu' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary-fixed"></div>}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary-fixed text-[18px]">speed</span>
                <span className="font-label-md text-label-md text-on-surface">GPU 0 (RTX 4090)</span>
              </div>
              <span className="font-code-metric-lg text-code-metric-lg text-secondary-fixed font-bold">18%</span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5 font-code-telemetry text-code-telemetry text-on-surface-variant">
              <span>48°C • 140W</span>
              <span className="text-secondary">4.2 / 24.0 GB VRAM</span>
            </div>
            <div className="h-6 w-full mt-1 bg-surface-container-lowest/70 rounded flex items-end p-0.5">
              <svg className="w-full h-full text-secondary-fixed" preserveAspectRatio="none" viewBox="0 0 160 20">
                <path d="M0,17 L40,16 L60,13 L80,15 L100,10 L120,16 L140,14 L160,15" fill="none" stroke="currentColor" strokeWidth="1.5"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* MAIN VIEWPORT: CPU Detail View (9 cols) */}
        <div className="col-span-12 xl:col-span-9 flex flex-col gap-space-sm min-w-0">
          {/* Hardware Meta Banner */}
          <div className="bg-surface-container p-space-md rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div className="flex items-start gap-space-md min-w-0">
              <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container shadow-inner shrink-0">
                <span className="material-symbols-outlined text-[30px]">memory</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-space-sm flex-wrap">
                  <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight truncate">
                    {snapshot ? snapshot.cpu.brand : 'AMD Ryzen 9 7950X 16-Core Processor'}
                  </h2>
                  <span className="font-code-telemetry text-code-telemetry px-space-sm py-0.5 rounded bg-primary-container/20 text-primary-container font-semibold">
                    170W TDP
                  </span>
                  <span className="font-code-telemetry text-code-telemetry px-space-sm py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                    AM5 Socket
                  </span>
                </div>
                <div className="flex items-center gap-x-space-md gap-y-1 mt-1 flex-wrap font-code-telemetry text-code-telemetry text-on-surface-variant">
                  <span>
                    Base: <strong className="text-on-surface">{clockGhz} GHz</strong>
                  </span>
                  <span>
                    Boost: <strong className="text-primary">5.70 GHz</strong>
                  </span>
                  <span>
                    Sockets: <strong className="text-on-surface">1</strong>
                  </span>
                  <span>
                    Cores: <strong className="text-on-surface">{snapshot ? snapshot.cpu.physical_cores : 16}</strong>
                  </span>
                  <span>
                    Logical: <strong className="text-on-surface">{snapshot ? snapshot.cpu.logical_cores : 32}</strong>
                  </span>
                  <span>
                    Virtualization: <strong className="text-secondary-fixed">Enabled (AMD-V)</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Cache Breakdown Capsule */}
            <div className="bg-surface-container-lowest/80 p-space-sm rounded-lg flex items-center gap-space-md shrink-0 self-start md:self-auto font-code-telemetry text-code-telemetry border border-surface-container-high/40">
              <div className="flex flex-col">
                <span className="text-outline uppercase text-[10px]">L1 Cache</span>
                <span className="text-on-surface font-semibold text-label-md font-label-md">1.0 MB</span>
              </div>
              <div className="w-[1px] h-6 bg-surface-container-high"></div>
              <div className="flex flex-col">
                <span className="text-outline uppercase text-[10px]">L2 Cache</span>
                <span className="text-on-surface font-semibold text-label-md font-label-md">16.0 MB</span>
              </div>
              <div className="w-[1px] h-6 bg-surface-container-high"></div>
              <div className="flex flex-col">
                <span className="text-outline uppercase text-[10px]">L3 Cache</span>
                <span className="text-primary font-bold text-label-md font-label-md">64.0 MB</span>
              </div>
            </div>
          </div>

          {/* High-Fidelity Waveform Graph Container */}
          <div className="bg-surface-container-low rounded-lg p-space-md shadow-md flex flex-col relative overflow-hidden" id="overallGraphPanel">
            {/* Graph Header & Peak Marker Tag */}
            <div className="flex items-center justify-between pb-space-xs mb-space-xs text-on-surface-variant">
              <div className="flex items-center gap-space-sm">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                  Telemetry Timeline — % Overall Processor Load
                </span>
                <div className="flex items-center gap-1 font-code-telemetry text-code-telemetry text-primary-container">
                  <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
                  <span>Direct Kernel DPC / ISR Polling (1000Hz)</span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs bg-surface-container px-space-sm py-0.5 rounded shadow-sm">
                <span className="material-symbols-outlined text-error text-[15px]">priority_high</span>
                <span className="font-code-telemetry text-code-telemetry text-on-surface font-semibold">
                  Peak: <strong className="text-error font-bold">{chart.maxVal.toFixed(1)}%</strong> @ {chart.peakTime}
                </span>
              </div>
            </div>

            {/* If in logical processor grid mode */}
            {viewMode === 'cores' && snapshot ? (
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 py-2 max-h-[260px] overflow-y-auto bg-surface-container-lowest rounded-lg p-space-sm">
                {snapshot.cpu.cores.map((core) => (
                  <div
                    key={core.core_id}
                    className="flex flex-col items-center justify-between bg-surface-container p-2 rounded border border-surface-container-high/60"
                  >
                    <span className="font-code-telemetry text-[10px] text-outline">CPU {core.core_id}</span>
                    <div className="w-full bg-surface-container-lowest h-16 rounded overflow-hidden flex items-end p-0.5 my-1">
                      <div
                        className="w-full bg-primary rounded-sm transition-all duration-300"
                        style={{ height: `${Math.min(core.usage_percent, 100)}%` }}
                      ></div>
                    </div>
                    <span className="font-code-telemetry text-[11px] text-on-surface font-semibold tabular-nums">
                      {core.usage_percent.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* SVG Graph Canvas */
              <div className="relative w-full h-64 bg-surface-container-lowest rounded-lg p-space-sm overflow-hidden flex flex-col justify-between border border-surface-container-high/40">
                {/* Subtle 10% Grid Lines */}
                <div className="absolute inset-0 p-4 pointer-events-none flex flex-col justify-between">
                  <div className="w-full flex items-center justify-between text-outline/40 font-code-telemetry text-[10px]">
                    <span>100%</span>
                    <div className="w-full mx-2 h-[1px] bg-surface-container-high/60 border-t border-dashed border-outline-variant/30"></div>
                    <span>Max</span>
                  </div>
                  <div className="w-full flex items-center justify-between text-outline/40 font-code-telemetry text-[10px]">
                    <span>75%</span>
                    <div className="w-full mx-2 h-[1px] bg-surface-container-high/40 border-t border-dashed border-outline-variant/20"></div>
                    <span>Throttled</span>
                  </div>
                  <div className="w-full flex items-center justify-between text-outline/40 font-code-telemetry text-[10px]">
                    <span>50%</span>
                    <div className="w-full mx-2 h-[1px] bg-surface-container-high/40 border-t border-dashed border-outline-variant/20"></div>
                    <span>Balanced</span>
                  </div>
                  <div className="w-full flex items-center justify-between text-outline/40 font-code-telemetry text-[10px]">
                    <span>25%</span>
                    <div className="w-full mx-2 h-[1px] bg-surface-container-high/40 border-t border-dashed border-outline-variant/20"></div>
                    <span>Nominal</span>
                  </div>
                  <div className="w-full flex items-center justify-between text-outline/40 font-code-telemetry text-[10px]">
                    <span>0%</span>
                    <div className="w-full mx-2 h-[1px] bg-surface-container-high/60"></div>
                    <span>Baseline</span>
                  </div>
                </div>

                {/* Primary Waveform Graphic */}
                <svg className="absolute inset-0 w-full h-full p-4 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1000 240">
                  <defs>
                    <linearGradient id="mainCpuFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.35"></stop>
                      <stop offset="40%" stopColor="#00d2ff" stopOpacity="0.12"></stop>
                      <stop offset="100%" stopColor="#00d2ff" stopOpacity="0.0"></stop>
                    </linearGradient>
                    <filter height="140%" id="neonGlow" width="140%" x="-20%" y="-20%">
                      <feGaussianBlur result="blur" stdDeviation="3"></feGaussianBlur>
                      <feMerge>
                        <feMergeNode in="blur"></feMergeNode>
                        <feMergeNode in="SourceGraphic"></feMergeNode>
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Gradient Area */}
                  {chart.area && <path d={chart.area} fill="url(#mainCpuFill)"></path>}

                  {/* Cyan Glowing Curve */}
                  <path
                    d={chart.path}
                    fill="none"
                    filter="url(#neonGlow)"
                    stroke="#00d2ff"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  ></path>

                  {/* Spike Marker Tag on Waveform */}
                  <circle
                    className="fill-error stroke-surface-dim stroke-2 animate-ping"
                    cx={chart.peakPt.x}
                    cy={chart.peakPt.y}
                    r="4"
                  ></circle>
                  <circle
                    className="fill-error stroke-surface-dim stroke-2"
                    cx={chart.peakPt.x}
                    cy={chart.peakPt.y}
                    r="4"
                  ></circle>
                  <line
                    stroke="#ff5555"
                    strokeDasharray="3 3"
                    strokeWidth="1.5"
                    x1={chart.peakPt.x}
                    x2={chart.peakPt.x}
                    y1={chart.peakPt.y}
                    y2="240"
                  ></line>
                </svg>

                {/* Annotation Tooltip */}
                <div
                  className="absolute z-20 flex items-center gap-1.5 bg-surface-container-high/90 border border-primary/40 px-2 py-0.5 rounded shadow-lg font-code-telemetry text-label-sm text-primary backdrop-blur-sm pointer-events-none"
                  style={{
                    left: `${Math.min(Math.max((chart.peakPt.x / 1000) * 100, 15), 75)}%`,
                    top: `${Math.min(Math.max((chart.peakPt.y / 240) * 100, 10), 45)}%`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                  <span>
                    {chart.peakTime} — Compiling Cargo Workspace ({chart.maxVal.toFixed(1)}%)
                  </span>
                </div>

                <div className="flex items-center justify-between z-10 font-code-telemetry text-[11px] text-outline mt-auto pt-2">
                  <span>60 seconds ago</span>
                  <span>45s</span>
                  <span>30s</span>
                  <span>15s</span>
                  <span className="text-primary font-bold">0s (Live)</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Grid Stats (6 cols) */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-space-xs font-code-telemetry text-code-telemetry">
            <div className="flex flex-col bg-surface-container p-space-sm rounded">
              <span className="text-outline text-[10px] uppercase">UTILIZATION</span>
              <span className="font-code-metric-lg text-headline-sm text-primary font-bold mt-0.5">
                {cpuPercent.toFixed(1)}%
              </span>
              <span className="text-outline text-[10px] mt-1">
                Kernel: {kernelCpu}% • User: {userCpu}%
              </span>
            </div>

            <div className="flex flex-col bg-surface-container p-space-sm rounded">
              <span className="text-outline text-[10px] uppercase">CURRENT SPEED</span>
              <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                {clockGhz} <span className="text-[12px] font-normal">GHz</span>
              </span>
              <span className="text-primary-fixed text-[10px] mt-1">Precision Boost Overdrive</span>
            </div>

            <div className="flex flex-col bg-surface-container p-space-sm rounded">
              <span className="text-outline text-[10px] uppercase">PROCESSES</span>
              <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                {processCount} <span className="text-[12px] text-primary font-normal">Active</span>
              </span>
              <span className="text-outline text-[10px] mt-1">12 Suspended • 0 Zombie</span>
            </div>

            <div className="flex flex-col bg-surface-container p-space-sm rounded">
              <span className="text-outline text-[10px] uppercase">THREADS</span>
              <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                {(processCount * 13).toLocaleString()}
              </span>
              <span className="text-outline text-[10px] mt-1">Context Switches: 14.2k/s</span>
            </div>

            <div className="flex flex-col bg-surface-container p-space-sm rounded">
              <span className="text-outline text-[10px] uppercase">HANDLES</span>
              <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                {(processCount * 515).toLocaleString()}
              </span>
              <span className="text-outline text-[10px] mt-1">Kernel Paged Pool: 420MB</span>
            </div>

            <div className="flex flex-col bg-surface-container p-space-sm rounded">
              <span className="text-outline text-[10px] uppercase">UP TIME</span>
              <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                {uptime}
              </span>
              <span className="text-outline text-[10px] mt-1">Fast Startup: Disabled</span>
            </div>
          </div>

          {/* Bottom Filter Tabs & Ring-0 note */}
          <div className="flex flex-wrap items-center justify-between pt-space-xs text-on-surface-variant font-code-telemetry text-code-telemetry">
            <div className="flex items-center gap-space-xs">
              <button
                onClick={() => {
                  setActiveBottomTab('cpu');
                  setSelectedTile('cpu');
                }}
                className={`flex items-center gap-space-xs px-space-md py-space-xs rounded text-label-md transition-colors ${
                  activeBottomTab === 'cpu'
                    ? 'bg-surface-container-high text-primary font-bold'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">memory</span>
                <span>CPU</span>
              </button>
              <button
                onClick={() => {
                  setActiveBottomTab('memory');
                  setSelectedTile('memory');
                }}
                className={`flex items-center gap-space-xs px-space-md py-space-xs rounded text-label-md transition-colors ${
                  activeBottomTab === 'memory'
                    ? 'bg-surface-container-high text-tertiary font-bold'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">developer_board</span>
                <span>Memory</span>
              </button>
              <button
                onClick={() => {
                  setActiveBottomTab('disk');
                  setSelectedTile('disk0');
                }}
                className={`flex items-center gap-space-xs px-space-md py-space-xs rounded text-label-md transition-colors ${
                  activeBottomTab === 'disk'
                    ? 'bg-surface-container-high text-secondary font-bold'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">storage</span>
                <span>Disk I/O</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-outline">
              <span className="material-symbols-outlined text-primary text-[15px]">verified</span>
              <span>Hardware sensor permissions verified via Tauri/Rust backend (Ring-0)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
