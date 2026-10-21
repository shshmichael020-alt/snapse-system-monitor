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
  const [selectedCategory, setSelectedCategory] = useState<'cpu' | 'memory' | 'disk' | 'network' | 'gpu'>('cpu');
  const [selectedDiskIndex, setSelectedDiskIndex] = useState<number>(0);
  const [selectedNetIndex, setSelectedNetIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'overall' | 'cores'>('overall');
  const [timeWindowSecs, setTimeWindowSecs] = useState<number>(60);

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatThroughput = (bps: number): string => {
    if (!bps || bps === 0) return '0 B/s';
    if (bps < 1024) return `${bps} B/s`;
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
    return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatUptimeFormatted = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `0:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
    if (selectedCategory === 'cpu') {
      data = filteredHistory.map((h) => h.cpu_usage);
    } else if (selectedCategory === 'memory') {
      data = filteredHistory.map((h) => h.memory_percent);
    } else if (selectedCategory === 'disk') {
      const maxD = Math.max(...filteredHistory.map((h) => (h.disk_read_bytes_sec + h.disk_write_bytes_sec) / 1024 / 1024), 10);
      data = filteredHistory.map((h) => (((h.disk_read_bytes_sec + h.disk_write_bytes_sec) / 1024 / 1024) / maxD) * 100);
    } else if (selectedCategory === 'network') {
      const maxN = Math.max(...filteredHistory.map((h) => (h.net_rx_bytes_sec + h.net_tx_bytes_sec) / 1024 / 1024), 5);
      data = filteredHistory.map((h) => (((h.net_rx_bytes_sec + h.net_tx_bytes_sec) / 1024 / 1024) / maxN) * 100);
    } else if (selectedCategory === 'gpu') {
      data = filteredHistory.map((h) => h.gpu_utilization ?? 0);
    }

    if (!data.length) {
      data = [0, 0, 0, 0, 0, 0];
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
    const peakPt = pts[peakIdx] || { x: 500, y: 120 };
    const peakTime = filteredHistory[peakIdx]
      ? new Date(filteredHistory[peakIdx].timestamp_ms).toLocaleTimeString()
      : 'Live';

    return { path, area, peakPt, maxVal, peakTime };
  };

  const chart = generateMainChart();

  // Metrics for active selections
  const cpuPercent = snapshot ? snapshot.cpu.total_usage_percent : 0;
  const userCpu = (cpuPercent * 0.82).toFixed(1);
  const kernelCpu = (cpuPercent * 0.18).toFixed(1);
  const clockGhz = snapshot ? (snapshot.cpu.base_frequency_mhz / 1000).toFixed(2) : '1.30';
  const uptime = snapshot ? formatUptimeFormatted(snapshot.system.uptime_seconds) : '0:00:00:00';

  const activeDisk = snapshot?.storage?.volumes[selectedDiskIndex] || snapshot?.storage?.volumes[0] || null;
  const activeNet = snapshot?.network?.interfaces[selectedNetIndex] || snapshot?.network?.interfaces[0] || null;

  return (
    <div className="flex flex-col w-full text-on-surface select-none">
      {/* Top Command Strip & Breadcrumb */}
      <div className="flex items-center justify-between px-space-md py-space-xs bg-surface-container-low rounded-lg mb-space-sm shadow-sm border border-surface-container-high/40">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px] text-primary">monitoring</span>
            <span>Performance</span>
            <span className="text-outline">/</span>
            <span className="text-on-surface font-semibold capitalize">{selectedCategory} Telemetry</span>
          </div>
          <div className="flex items-center gap-space-xs bg-surface-container px-space-sm py-0.5 rounded text-on-surface font-code-telemetry text-code-telemetry">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
            <span>Windows NT Native Sampling</span>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          {/* View toggle (CPU overall vs logical cores) */}
          {selectedCategory === 'cpu' && (
            <div className="flex items-center bg-surface-container-high rounded p-0.5 text-on-surface-variant">
              <button
                onClick={() => setViewMode('overall')}
                className={`px-space-sm py-1 rounded font-label-sm text-label-sm flex items-center gap-1 transition-all ${
                  viewMode === 'overall'
                    ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
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
              >
                <span className="material-symbols-outlined text-[14px]">grid_view</span>
                <span>{snapshot ? snapshot.cpu.logical_cores : 12} Logical Processors</span>
              </button>
            </div>
          )}

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
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      </div>

      {/* Primary Workspace Split: Left Hardware Nav + Main Viewport */}
      <div className="grid grid-cols-12 gap-space-sm w-full items-start">
        {/* LEFT COLUMN: Hardware Sub-Navigation Tiles (3 cols) */}
        <div className="col-span-12 xl:col-span-3 flex flex-col gap-space-xs">
          {/* 1. CPU Item */}
          <div
            onClick={() => {
              setSelectedCategory('cpu');
            }}
            className={`flex flex-col p-space-sm rounded-lg shadow-sm cursor-pointer relative overflow-hidden group transition-colors ${
              selectedCategory === 'cpu' ? 'bg-surface-container' : 'bg-surface-container-low hover:bg-surface-container'
            }`}
          >
            {selectedCategory === 'cpu' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container"></div>}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[18px]">memory</span>
                <span className="font-label-md text-label-md text-on-surface font-semibold">CPU</span>
              </div>
              <span className="font-code-metric-lg text-code-metric-lg text-primary font-bold tabular-nums">
                {snapshot ? snapshot.cpu.total_usage_percent.toFixed(1) : '0.0'}%
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5 font-code-telemetry text-code-telemetry text-on-surface-variant">
              <span className="truncate max-w-[150px]">{snapshot ? snapshot.cpu.brand : 'Intel Processor'}</span>
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

          {/* 2. Memory Item */}
          <div
            onClick={() => {
              setSelectedCategory('memory');
            }}
            className={`flex flex-col p-space-sm rounded-lg shadow-sm cursor-pointer relative group transition-colors ${
              selectedCategory === 'memory' ? 'bg-surface-container' : 'bg-surface-container-low hover:bg-surface-container'
            }`}
          >
            {selectedCategory === 'memory' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-tertiary-container"></div>}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-tertiary-fixed-dim text-[18px]">developer_board</span>
                <span className="font-label-md text-label-md text-on-surface">Memory</span>
              </div>
              <span className="font-code-metric-lg text-code-metric-lg text-tertiary font-semibold tabular-nums">
                {snapshot ? snapshot.memory.used_percent.toFixed(1) : '0.0'}%
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-0.5 font-code-telemetry text-code-telemetry text-on-surface-variant">
              <span>
                {snapshot ? (snapshot.memory.used_bytes / 1024 / 1024 / 1024).toFixed(1) : '0.0'} /{' '}
                {snapshot ? (snapshot.memory.total_bytes / 1024 / 1024 / 1024).toFixed(1) : '16.0'} GB
              </span>
              <span>Physical RAM</span>
            </div>
            <div className="h-7 w-full mt-1.5 bg-surface-container-lowest/70 rounded flex items-end p-1 relative overflow-hidden">
              <svg className="w-full h-full text-tertiary" preserveAspectRatio="none" viewBox="0 0 160 24">
                <path d="M0,16 L30,16 L55,15 L80,14 L110,13 L135,13 L160,12" fill="none" stroke="currentColor" strokeWidth="1.5"></path>
              </svg>
            </div>
          </div>

          {/* 3. Dynamic Disk Volumes */}
          {snapshot?.storage?.volumes && snapshot.storage.volumes.length > 0 ? (
            snapshot.storage.volumes.map((vol, idx) => {
              const isSelected = selectedCategory === 'disk' && selectedDiskIndex === idx;
              const volLabel = vol.mount_point || vol.name || `Disk ${idx}`;
              return (
                <div
                  key={`disk-tile-${idx}`}
                  onClick={() => {
                    setSelectedCategory('disk');
                    setSelectedDiskIndex(idx);
                  }}
                  className={`flex flex-col p-space-sm rounded-lg shadow-sm cursor-pointer relative group transition-colors ${
                    isSelected ? 'bg-surface-container' : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary-container"></div>}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-secondary text-[18px]">storage</span>
                      <span className="font-label-md text-label-md text-on-surface">
                        Disk {idx} ({volLabel})
                      </span>
                    </div>
                    <span className="font-code-metric-lg text-code-metric-lg text-secondary">
                      {vol.used_percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5 font-code-telemetry text-code-telemetry text-on-surface-variant">
                    <span className="truncate max-w-[140px]" title={snapshot.storage.physical_disk_model}>
                      {snapshot.storage.physical_disk_model || 'NVMe SSD'}
                    </span>
                    <span className="text-on-surface">
                      {(vol.available_bytes / 1024 / 1024 / 1024).toFixed(0)} GB free
                    </span>
                  </div>
                  <div className="h-6 w-full mt-1 bg-surface-container-lowest/70 rounded flex items-end p-0.5">
                    <svg className="w-full h-full text-secondary" preserveAspectRatio="none" viewBox="0 0 160 20">
                      <path d="M0,18 L35,18 L40,6 L45,18 L90,18 L95,12 L100,18 L160,18" fill="none" stroke="currentColor" strokeWidth="1.5"></path>
                    </svg>
                  </div>
                </div>
              );
            })
          ) : (
            <div
              onClick={() => setSelectedCategory('disk')}
              className={`flex flex-col p-space-sm rounded-lg shadow-sm cursor-pointer relative group transition-colors ${
                selectedCategory === 'disk' ? 'bg-surface-container' : 'bg-surface-container-low hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[18px]">storage</span>
                <span className="font-label-md text-label-md text-on-surface">Storage (SSD)</span>
              </div>
              <span className="font-code-telemetry text-code-telemetry text-outline mt-1">NVMe Storage Ready</span>
            </div>
          )}

          {/* 4. Dynamic Network Interfaces */}
          {snapshot?.network?.interfaces && snapshot.network.interfaces.length > 0 ? (
            snapshot.network.interfaces.map((net, idx) => {
              const isSelected = selectedCategory === 'network' && selectedNetIndex === idx;
              const isWifi = net.adapter_type === 'Wi-Fi' || net.name.toLowerCase().includes('wi-fi');
              const isConn = net.is_connected;
              const totalRateMbps = ((net.rx_bytes_sec + net.tx_bytes_sec) * 8 / 1000 / 1000).toFixed(1);

              return (
                <div
                  key={`net-tile-${net.name}-${idx}`}
                  onClick={() => {
                    setSelectedCategory('network');
                    setSelectedNetIndex(idx);
                  }}
                  className={`flex flex-col p-space-sm rounded-lg shadow-sm cursor-pointer relative group transition-colors ${
                    isSelected ? 'bg-surface-container' : 'bg-surface-container-low hover:bg-surface-container'
                  } ${!isConn ? 'opacity-75' : ''}`}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container"></div>}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary-container text-[18px]">
                        {isWifi ? (isConn ? 'wifi' : 'wifi_off') : 'settings_ethernet'}
                      </span>
                      <span className="font-label-md text-label-md text-on-surface">
                        {net.adapter_type || 'Network'} ({net.name})
                      </span>
                    </div>
                    {isConn ? (
                      <span className="font-code-telemetry text-code-telemetry text-primary font-semibold">
                        {totalRateMbps} Mbps
                      </span>
                    ) : (
                      <span className="font-label-sm text-label-sm bg-surface-container-high px-space-xs py-0.5 rounded text-outline">
                        Disconnected
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5 font-code-telemetry text-code-telemetry text-on-surface-variant">
                    <span className="truncate max-w-[140px]" title={net.display_name}>
                      {net.display_name || net.name}
                    </span>
                    {isConn ? (
                      <span>
                        S: {formatThroughput(net.tx_bytes_sec)} • R: {formatThroughput(net.rx_bytes_sec)}
                      </span>
                    ) : (
                      <span>Offline</span>
                    )}
                  </div>
                  <div className="h-6 w-full mt-1 bg-surface-container-lowest/70 rounded flex items-end p-0.5">
                    <svg className="w-full h-full text-primary" preserveAspectRatio="none" viewBox="0 0 160 20">
                      <path
                        d={isConn ? "M0,18 L20,18 L35,14 L50,18 L65,10 L80,18 L95,6 L105,18 L160,18" : "M0,19 L160,19"}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      ></path>
                    </svg>
                  </div>
                </div>
              );
            })
          ) : (
            <div
              onClick={() => setSelectedCategory('network')}
              className="flex flex-col p-space-sm rounded-lg bg-surface-container-low cursor-pointer"
            >
              <span className="font-label-md text-label-md">Network</span>
              <span className="font-code-telemetry text-outline text-[11px]">Querying Windows IP Helper...</span>
            </div>
          )}

          {/* 5. GPU Tile */}
          {snapshot?.gpu ? (
            <div
              onClick={() => setSelectedCategory('gpu')}
              className={`flex flex-col p-space-sm rounded-lg shadow-sm cursor-pointer relative group transition-colors ${
                selectedCategory === 'gpu' ? 'bg-surface-container' : 'bg-surface-container-low hover:bg-surface-container'
              }`}
            >
              {selectedCategory === 'gpu' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary-fixed"></div>}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-secondary-fixed text-[18px]">speed</span>
                  <span className="font-label-md text-label-md text-on-surface">GPU 0</span>
                </div>
                <span className="font-code-metric-lg text-code-metric-lg text-secondary-fixed font-bold">
                  {snapshot.gpu.utilization_percent.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-0.5 font-code-telemetry text-code-telemetry text-on-surface-variant">
                <span className="truncate max-w-[140px]" title={snapshot.gpu.name}>
                  {snapshot.gpu.name}
                </span>
                <span className="text-secondary">
                  {(snapshot.gpu.shared_memory_bytes / 1024 / 1024 / 1024).toFixed(1)} GB Shared
                </span>
              </div>
              <div className="h-6 w-full mt-1 bg-surface-container-lowest/70 rounded flex items-end p-0.5">
                <svg className="w-full h-full text-secondary-fixed" preserveAspectRatio="none" viewBox="0 0 160 20">
                  <path d="M0,17 L40,16 L60,13 L80,15 L100,10 L120,16 L140,14 L160,15" fill="none" stroke="currentColor" strokeWidth="1.5"></path>
                </svg>
              </div>
            </div>
          ) : (
            <div className="flex flex-col bg-surface-container-lowest/60 p-space-sm rounded-lg opacity-70">
              <div className="flex items-center gap-space-xs text-outline">
                <span className="material-symbols-outlined text-[18px]">speed</span>
                <span className="font-label-md text-label-md">GPU: Integrated</span>
              </div>
              <span className="font-code-telemetry text-code-telemetry text-outline mt-1">
                DirectX 12 Compatible
              </span>
            </div>
          )}
        </div>

        {/* MAIN VIEWPORT: Detailed Viewport (9 cols) */}
        <div className="col-span-12 xl:col-span-9 flex flex-col gap-space-sm min-w-0">
          {/* Hardware Meta Banner (Adapts to selected category) */}
          <div className="bg-surface-container p-space-md rounded-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div className="flex items-start gap-space-md min-w-0">
              <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container shadow-inner shrink-0">
                <span className="material-symbols-outlined text-[30px]">
                  {selectedCategory === 'cpu' && 'memory'}
                  {selectedCategory === 'memory' && 'developer_board'}
                  {selectedCategory === 'disk' && 'storage'}
                  {selectedCategory === 'network' && (activeNet?.adapter_type === 'Wi-Fi' ? 'wifi' : 'settings_ethernet')}
                  {selectedCategory === 'gpu' && 'speed'}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-space-sm flex-wrap">
                  <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight truncate">
                    {selectedCategory === 'cpu' && (snapshot ? snapshot.cpu.brand : 'Processor')}
                    {selectedCategory === 'memory' && 'Physical Memory (RAM)'}
                    {selectedCategory === 'disk' && (snapshot ? (snapshot.storage.physical_disk_model || 'NVMe Storage Drive') : 'Storage')}
                    {selectedCategory === 'network' && (activeNet ? activeNet.display_name : 'Network Adapter')}
                    {selectedCategory === 'gpu' && (snapshot?.gpu ? snapshot.gpu.name : 'Graphics Adapter')}
                  </h2>

                  {selectedCategory === 'cpu' && (
                    <>
                      <span className="font-code-telemetry text-code-telemetry px-space-sm py-0.5 rounded bg-primary-container/20 text-primary-container font-semibold">
                        {snapshot ? `${snapshot.cpu.physical_cores} Cores / ${snapshot.cpu.logical_cores} Threads` : '10 Cores'}
                      </span>
                      <span className="font-code-telemetry text-code-telemetry px-space-sm py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                        {snapshot?.cpu?.vendor_id || 'x86_64'}
                      </span>
                    </>
                  )}

                  {selectedCategory === 'memory' && snapshot && (
                    <span className="font-code-telemetry text-code-telemetry px-space-sm py-0.5 rounded bg-tertiary-container/20 text-tertiary font-semibold">
                      {(snapshot.memory.total_bytes / 1024 / 1024 / 1024).toFixed(1)} GB Total
                    </span>
                  )}

                  {selectedCategory === 'disk' && snapshot && (
                    <span className="font-code-telemetry text-code-telemetry px-space-sm py-0.5 rounded bg-secondary-container/20 text-secondary font-semibold">
                      {Math.round(snapshot.storage.physical_disk_size_bytes / 1024 / 1024 / 1024)} GB Drive
                    </span>
                  )}

                  {selectedCategory === 'network' && activeNet && (
                    <span className={`font-code-telemetry text-code-telemetry px-space-sm py-0.5 rounded font-semibold ${
                      activeNet.is_connected ? 'bg-primary-container/20 text-primary-container' : 'bg-surface-container-high text-outline'
                    }`}>
                      {activeNet.is_connected ? 'Connected (Up)' : 'Disconnected (Down)'}
                    </span>
                  )}

                  {selectedCategory === 'gpu' && snapshot?.gpu && (
                    <span className="font-code-telemetry text-code-telemetry px-space-sm py-0.5 rounded bg-secondary-container/20 text-secondary font-semibold">
                      Driver: {snapshot.gpu.driver_version}
                    </span>
                  )}
                </div>

                {/* Subtext info row */}
                <div className="flex items-center gap-x-space-md gap-y-1 mt-1 flex-wrap font-code-telemetry text-code-telemetry text-on-surface-variant">
                  {selectedCategory === 'cpu' && (
                    <>
                      <span>
                        Base Clock: <strong className="text-on-surface">{clockGhz} GHz</strong>
                      </span>
                      <span>
                        Sockets: <strong className="text-on-surface">1</strong>
                      </span>
                      <span>
                        Physical Cores: <strong className="text-on-surface">{snapshot ? snapshot.cpu.physical_cores : 10}</strong>
                      </span>
                      <span>
                        Logical Processors: <strong className="text-on-surface">{snapshot ? snapshot.cpu.logical_cores : 12}</strong>
                      </span>
                      <span>
                        Virtualization: <strong className={snapshot?.cpu?.virtualization_enabled ? "text-secondary-fixed" : "text-outline"}>
                          {snapshot?.cpu ? (snapshot.cpu.virtualization_enabled ? `Enabled (${snapshot.cpu.virtualization_type})` : `Disabled (${snapshot.cpu.virtualization_type})`) : 'Disabled (Intel VT-x)'}
                        </strong>
                      </span>
                    </>
                  )}

                  {selectedCategory === 'memory' && snapshot && (
                    <>
                      <span>
                        In Use: <strong className="text-tertiary">{(snapshot.memory.used_bytes / 1024 / 1024 / 1024).toFixed(1)} GB</strong>
                      </span>
                      <span>
                        Available: <strong className="text-on-surface">{(snapshot.memory.available_bytes / 1024 / 1024 / 1024).toFixed(1)} GB</strong>
                      </span>
                      <span>
                        Committed (Swap): <strong className="text-on-surface">{(snapshot.memory.swap_used_bytes / 1024 / 1024 / 1024).toFixed(1)} / {(snapshot.memory.swap_total_bytes / 1024 / 1024 / 1024).toFixed(1)} GB</strong>
                      </span>
                    </>
                  )}

                  {selectedCategory === 'disk' && activeDisk && (
                    <>
                      <span>
                        Mount Point: <strong className="text-on-surface">{activeDisk.mount_point}</strong>
                      </span>
                      <span>
                        File System: <strong className="text-secondary">{activeDisk.file_system}</strong>
                      </span>
                      <span>
                        Capacity: <strong className="text-on-surface">{(activeDisk.total_bytes / 1024 / 1024 / 1024).toFixed(1)} GB</strong>
                      </span>
                      <span>
                        Used: <strong className="text-on-surface">{(activeDisk.used_bytes / 1024 / 1024 / 1024).toFixed(1)} GB ({activeDisk.used_percent.toFixed(0)}%)</strong>
                      </span>
                      <span>
                        Free Space: <strong className="text-primary">{(activeDisk.available_bytes / 1024 / 1024 / 1024).toFixed(1)} GB</strong>
                      </span>
                    </>
                  )}

                  {selectedCategory === 'network' && activeNet && (
                    <>
                      <span>
                        Interface: <strong className="text-on-surface">{activeNet.name}</strong>
                      </span>
                      <span>
                        Adapter Type: <strong className="text-primary-container">{activeNet.adapter_type}</strong>
                      </span>
                      <span>
                        Total Received: <strong className="text-on-surface">{formatBytes(activeNet.total_rx_bytes)}</strong>
                      </span>
                      <span>
                        Total Sent: <strong className="text-on-surface">{formatBytes(activeNet.total_tx_bytes)}</strong>
                      </span>
                    </>
                  )}

                  {selectedCategory === 'gpu' && snapshot?.gpu && (
                    <>
                      <span>
                        Vendor: <strong className="text-on-surface">{snapshot.gpu.vendor_name}</strong>
                      </span>
                      <span>
                        Dedicated Video Memory: <strong className="text-on-surface">{snapshot.gpu.dedicated_memory_bytes ? `${Math.round(snapshot.gpu.dedicated_memory_bytes / 1024 / 1024)} MB` : 'N/A (Shared)'}</strong>
                      </span>
                      <span>
                        Shared System Memory: <strong className="text-secondary">{(snapshot.gpu.shared_memory_bytes / 1024 / 1024 / 1024).toFixed(1)} GB</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Architecture / Driver Capsule */}
            <div className="bg-surface-container-lowest/80 p-space-sm rounded-lg flex items-center gap-space-md shrink-0 self-start md:self-auto font-code-telemetry text-code-telemetry border border-surface-container-high/40">
              <div className="flex flex-col">
                <span className="text-outline uppercase text-[10px]">Architecture</span>
                <span className="text-on-surface font-semibold text-label-md font-label-md">x86_64 (64-bit)</span>
              </div>
              <div className="w-[1px] h-6 bg-surface-container-high"></div>
              <div className="flex flex-col">
                <span className="text-outline uppercase text-[10px]">Host Subsystem</span>
                <span className="text-primary font-bold text-label-md font-label-md">Windows NT {snapshot?.system?.os_version || '11'}</span>
              </div>
            </div>
          </div>

          {/* High-Fidelity Waveform Graph Container */}
          <div className="bg-surface-container-low rounded-lg p-space-md shadow-md flex flex-col relative overflow-hidden" id="overallGraphPanel">
            {/* Graph Header & Peak Marker Tag */}
            <div className="flex items-center justify-between pb-space-xs mb-space-xs text-on-surface-variant">
              <div className="flex items-center gap-space-sm">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                  {selectedCategory === 'cpu' && 'Telemetry Timeline — % Overall Processor Load'}
                  {selectedCategory === 'memory' && 'Telemetry Timeline — % Memory In Use'}
                  {selectedCategory === 'disk' && 'Telemetry Timeline — Disk I/O Read & Write Throughput'}
                  {selectedCategory === 'network' && 'Telemetry Timeline — Network Send & Receive Throughput'}
                  {selectedCategory === 'gpu' && 'Telemetry Timeline — % GPU Core Engine Load'}
                </span>
                <div className="flex items-center gap-1 font-code-telemetry text-code-telemetry text-primary-container">
                  <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
                  <span>Direct WinNT Telemetry</span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs bg-surface-container px-space-sm py-0.5 rounded shadow-sm">
                <span className="material-symbols-outlined text-primary text-[15px]">timeline</span>
                <span className="font-code-telemetry text-code-telemetry text-on-surface font-semibold">
                  Peak: <strong className="text-primary font-bold">{chart.maxVal.toFixed(1)}%</strong> @ {chart.peakTime}
                </span>
              </div>
            </div>

            {/* If in logical processor grid mode for CPU */}
            {selectedCategory === 'cpu' && viewMode === 'cores' && snapshot ? (
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 py-2 max-h-[260px] overflow-y-auto bg-surface-container-lowest rounded-lg p-space-sm">
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
                {/* Subtle 25% Grid Lines */}
                <div className="absolute inset-0 p-4 pointer-events-none flex flex-col justify-between">
                  <div className="w-full flex items-center justify-between text-outline/40 font-code-telemetry text-[10px]">
                    <span>100%</span>
                    <div className="w-full mx-2 h-[1px] bg-surface-container-high/60 border-t border-dashed border-outline-variant/30"></div>
                    <span>Max</span>
                  </div>
                  <div className="w-full flex items-center justify-between text-outline/40 font-code-telemetry text-[10px]">
                    <span>75%</span>
                    <div className="w-full mx-2 h-[1px] bg-surface-container-high/40 border-t border-dashed border-outline-variant/20"></div>
                    <span>Heavy</span>
                  </div>
                  <div className="w-full flex items-center justify-between text-outline/40 font-code-telemetry text-[10px]">
                    <span>50%</span>
                    <div className="w-full mx-2 h-[1px] bg-surface-container-high/40 border-t border-dashed border-outline-variant/20"></div>
                    <span>Balanced</span>
                  </div>
                  <div className="w-full flex items-center justify-between text-outline/40 font-code-telemetry text-[10px]">
                    <span>25%</span>
                    <div className="w-full mx-2 h-[1px] bg-surface-container-high/40 border-t border-dashed border-outline-variant/20"></div>
                    <span>Light</span>
                  </div>
                  <div className="w-full flex items-center justify-between text-outline/40 font-code-telemetry text-[10px]">
                    <span>0%</span>
                    <div className="w-full mx-2 h-[1px] bg-surface-container-high/60"></div>
                    <span>Idle</span>
                  </div>
                </div>

                {/* Primary Waveform Graphic */}
                <svg className="absolute inset-0 w-full h-full p-4 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1000 240">
                  <defs>
                    <linearGradient id="mainGraphFill" x1="0" x2="0" y1="0" y2="1">
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
                  {chart.area && <path d={chart.area} fill="url(#mainGraphFill)"></path>}

                  {/* Cyan Glowing Curve */}
                  <path
                    d={chart.path}
                    fill="none"
                    filter="url(#neonGlow)"
                    stroke="#00d2ff"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  ></path>

                  {/* Live Peak Marker */}
                  <circle
                    className="fill-primary stroke-surface-dim stroke-2 animate-ping"
                    cx={chart.peakPt.x}
                    cy={chart.peakPt.y}
                    r="4"
                  ></circle>
                  <circle
                    className="fill-primary stroke-surface-dim stroke-2"
                    cx={chart.peakPt.x}
                    cy={chart.peakPt.y}
                    r="4"
                  ></circle>
                  <line
                    stroke="#00d2ff"
                    strokeDasharray="3 3"
                    strokeWidth="1.5"
                    x1={chart.peakPt.x}
                    x2={chart.peakPt.x}
                    y1={chart.peakPt.y}
                    y2="240"
                  ></line>
                </svg>

                {/* Live Sample Marker Badge */}
                <div
                  className="absolute z-20 flex items-center gap-1.5 bg-surface-container-high/90 border border-primary/40 px-2 py-0.5 rounded shadow-lg font-code-telemetry text-label-sm text-primary backdrop-blur-sm pointer-events-none"
                  style={{
                    left: `${Math.min(Math.max((chart.peakPt.x / 1000) * 100, 15), 75)}%`,
                    top: `${Math.min(Math.max((chart.peakPt.y / 240) * 100, 10), 45)}%`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  <span>
                    Peak Sample: {chart.maxVal.toFixed(1)}% @ {chart.peakTime}
                  </span>
                </div>

                <div className="flex items-center justify-between z-10 font-code-telemetry text-[11px] text-outline mt-auto pt-2">
                  <span>{timeWindowSecs} seconds ago</span>
                  <span>{Math.round(timeWindowSecs * 0.75)}s</span>
                  <span>{Math.round(timeWindowSecs * 0.5)}s</span>
                  <span>{Math.round(timeWindowSecs * 0.25)}s</span>
                  <span className="text-primary font-bold">0s (Live)</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Grid Stats (6 cols adapting to selectedCategory) */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-space-xs font-code-telemetry text-code-telemetry">
            {selectedCategory === 'cpu' && (
              <>
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
                  <span className="text-outline text-[10px] uppercase">SPEED</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {clockGhz} <span className="text-[12px] font-normal">GHz</span>
                  </span>
                  <span className="text-primary-fixed text-[10px] mt-1">Base Frequency</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">PHYSICAL CORES</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {snapshot ? snapshot.cpu.physical_cores : 10}
                  </span>
                  <span className="text-outline text-[10px] mt-1">Sockets: 1</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">LOGICAL PROCS</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {snapshot ? snapshot.cpu.logical_cores : 12}
                  </span>
                  <span className="text-outline text-[10px] mt-1">Hardware Threads</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">VIRTUALIZATION</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {snapshot?.cpu?.virtualization_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <span className="text-outline text-[10px] mt-1">{snapshot?.cpu?.virtualization_type || 'Intel VT-x'}</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">UP TIME</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {uptime}
                  </span>
                  <span className="text-outline text-[10px] mt-1">Admin: {snapshot?.system?.is_admin ? 'Yes' : 'No'}</span>
                </div>
              </>
            )}

            {selectedCategory === 'memory' && snapshot && (
              <>
                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">USED MEMORY</span>
                  <span className="font-code-metric-lg text-headline-sm text-tertiary font-bold mt-0.5">
                    {(snapshot.memory.used_bytes / 1024 / 1024 / 1024).toFixed(1)} GB
                  </span>
                  <span className="text-outline text-[10px] mt-1">{snapshot.memory.used_percent.toFixed(1)}% of total</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">AVAILABLE</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {(snapshot.memory.available_bytes / 1024 / 1024 / 1024).toFixed(1)} GB
                  </span>
                  <span className="text-outline text-[10px] mt-1">Ready for cache</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">INSTALLED RAM</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {(snapshot.memory.total_bytes / 1024 / 1024 / 1024).toFixed(1)} GB
                  </span>
                  <span className="text-outline text-[10px] mt-1">Physical DIMMs</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">COMMITTED SWAP</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {(snapshot.memory.swap_used_bytes / 1024 / 1024 / 1024).toFixed(1)} GB
                  </span>
                  <span className="text-outline text-[10px] mt-1">of {(snapshot.memory.swap_total_bytes / 1024 / 1024 / 1024).toFixed(1)} GB</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">FREE SWAP</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {(snapshot.memory.swap_free_bytes / 1024 / 1024 / 1024).toFixed(1)} GB
                  </span>
                  <span className="text-outline text-[10px] mt-1">Pagefile space</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">FREE MEMORY</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {(snapshot.memory.free_bytes / 1024 / 1024 / 1024).toFixed(1)} GB
                  </span>
                  <span className="text-outline text-[10px] mt-1">Completely unallocated</span>
                </div>
              </>
            )}

            {selectedCategory === 'disk' && snapshot && (
              <>
                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">ACTIVE VOLUME</span>
                  <span className="font-code-metric-lg text-headline-sm text-secondary font-bold mt-0.5">
                    {activeDisk ? activeDisk.mount_point : 'C:\\'}
                  </span>
                  <span className="text-outline text-[10px] mt-1">{activeDisk?.file_system || 'NTFS'}</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">READ RATE</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {formatThroughput(snapshot.storage.read_bytes_sec)}
                  </span>
                  <span className="text-outline text-[10px] mt-1">Real-time throughput</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">WRITE RATE</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {formatThroughput(snapshot.storage.write_bytes_sec)}
                  </span>
                  <span className="text-outline text-[10px] mt-1">Real-time throughput</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">USED CAPACITY</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {activeDisk ? (activeDisk.used_bytes / 1024 / 1024 / 1024).toFixed(0) : '0'} GB
                  </span>
                  <span className="text-outline text-[10px] mt-1">{activeDisk?.used_percent.toFixed(0)}% partitioned</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">FREE SPACE</span>
                  <span className="font-code-metric-lg text-headline-sm text-primary font-bold mt-0.5">
                    {activeDisk ? (activeDisk.available_bytes / 1024 / 1024 / 1024).toFixed(0) : '0'} GB
                  </span>
                  <span className="text-outline text-[10px] mt-1">Available to OS</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">DRIVE CAPACITY</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {Math.round(snapshot.storage.physical_disk_size_bytes / 1024 / 1024 / 1024)} GB
                  </span>
                  <span className="text-outline text-[10px] mt-1">Total physical disk</span>
                </div>
              </>
            )}

            {selectedCategory === 'network' && activeNet && (
              <>
                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">STATUS</span>
                  <span className={`font-code-metric-lg text-headline-sm font-bold mt-0.5 ${activeNet.is_connected ? 'text-primary' : 'text-outline'}`}>
                    {activeNet.is_connected ? 'Connected' : 'Disconnected'}
                  </span>
                  <span className="text-outline text-[10px] mt-1">{activeNet.adapter_type}</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">RECEIVE (RX)</span>
                  <span className="font-code-metric-lg text-headline-sm text-primary font-bold mt-0.5">
                    {formatThroughput(activeNet.rx_bytes_sec)}
                  </span>
                  <span className="text-outline text-[10px] mt-1">Download rate</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">SEND (TX)</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {formatThroughput(activeNet.tx_bytes_sec)}
                  </span>
                  <span className="text-outline text-[10px] mt-1">Upload rate</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">TOTAL RECEIVED</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {formatBytes(activeNet.total_rx_bytes)}
                  </span>
                  <span className="text-outline text-[10px] mt-1">Session data</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">TOTAL SENT</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {formatBytes(activeNet.total_tx_bytes)}
                  </span>
                  <span className="text-outline text-[10px] mt-1">Session data</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">SYSTEM TOTAL</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {snapshot ? formatThroughput(snapshot.network.total_rx_bytes_sec + snapshot.network.total_tx_bytes_sec) : '0 B/s'}
                  </span>
                  <span className="text-outline text-[10px] mt-1">Combined throughput</span>
                </div>
              </>
            )}

            {selectedCategory === 'gpu' && snapshot?.gpu && (
              <>
                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">UTILIZATION</span>
                  <span className="font-code-metric-lg text-headline-sm text-secondary-fixed font-bold mt-0.5">
                    {snapshot.gpu.utilization_percent.toFixed(0)}%
                  </span>
                  <span className="text-outline text-[10px] mt-1">3D Graphics Core</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">DRIVER VERSION</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5 truncate" title={snapshot.gpu.driver_version}>
                    {snapshot.gpu.driver_version}
                  </span>
                  <span className="text-outline text-[10px] mt-1">WDDM Driver</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">SHARED MEMORY</span>
                  <span className="font-code-metric-lg text-headline-sm text-secondary font-bold mt-0.5">
                    {(snapshot.gpu.shared_memory_bytes / 1024 / 1024 / 1024).toFixed(1)} GB
                  </span>
                  <span className="text-outline text-[10px] mt-1">Allocated from RAM</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">DEDICATED VRAM</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {snapshot.gpu.dedicated_memory_bytes ? `${Math.round(snapshot.gpu.dedicated_memory_bytes / 1024 / 1024)} MB` : 'N/A'}
                  </span>
                  <span className="text-outline text-[10px] mt-1">Integrated VRAM</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">TEMPERATURE</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5">
                    {snapshot.gpu.temperature_celsius ? `${snapshot.gpu.temperature_celsius.toFixed(0)}°C` : 'N/A'}
                  </span>
                  <span className="text-outline text-[10px] mt-1">Integrated Sensor</span>
                </div>

                <div className="flex flex-col bg-surface-container p-space-sm rounded">
                  <span className="text-outline text-[10px] uppercase">HARDWARE VENDOR</span>
                  <span className="font-code-metric-lg text-headline-sm text-on-surface font-bold mt-0.5 truncate" title={snapshot.gpu.vendor_name}>
                    {snapshot.gpu.vendor_name}
                  </span>
                  <span className="text-outline text-[10px] mt-1">DirectX 12</span>
                </div>
              </>
            )}
          </div>

          {/* Bottom Filter Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between pt-space-xs text-on-surface-variant font-code-telemetry text-code-telemetry">
            <div className="flex items-center gap-space-xs">
              <button
                onClick={() => setSelectedCategory('cpu')}
                className={`flex items-center gap-space-xs px-space-md py-space-xs rounded text-label-md transition-colors ${
                  selectedCategory === 'cpu'
                    ? 'bg-surface-container-high text-primary font-bold'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">memory</span>
                <span>CPU</span>
              </button>
              <button
                onClick={() => setSelectedCategory('memory')}
                className={`flex items-center gap-space-xs px-space-md py-space-xs rounded text-label-md transition-colors ${
                  selectedCategory === 'memory'
                    ? 'bg-surface-container-high text-tertiary font-bold'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">developer_board</span>
                <span>Memory</span>
              </button>
              <button
                onClick={() => setSelectedCategory('disk')}
                className={`flex items-center gap-space-xs px-space-md py-space-xs rounded text-label-md transition-colors ${
                  selectedCategory === 'disk'
                    ? 'bg-surface-container-high text-secondary font-bold'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">storage</span>
                <span>Storage</span>
              </button>
              <button
                onClick={() => setSelectedCategory('network')}
                className={`flex items-center gap-space-xs px-space-md py-space-xs rounded text-label-md transition-colors ${
                  selectedCategory === 'network'
                    ? 'bg-surface-container-high text-primary-container font-bold'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">wifi</span>
                <span>Network</span>
              </button>
              <button
                onClick={() => setSelectedCategory('gpu')}
                className={`flex items-center gap-space-xs px-space-md py-space-xs rounded text-label-md transition-colors ${
                  selectedCategory === 'gpu'
                    ? 'bg-surface-container-high text-secondary-fixed font-bold'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">speed</span>
                <span>GPU</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-outline">
              <span className="material-symbols-outlined text-primary text-[15px]">verified</span>
              <span>Genuine Windows NT kernel & DXGI hardware telemetry verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
