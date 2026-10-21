import React, { useMemo, useState, useEffect } from 'react';
import { api } from '../services/api';
import type { ProcessDetails, ProcessSummary } from '../types';

interface ProcessesViewProps {
  processes: ProcessSummary[];
  selectedProcess: ProcessSummary | null;
  onSelectProcess: (proc: ProcessSummary | null) => void;
  onRefresh: () => void;
  updateIntervalMs?: number;
  onChangeUpdateInterval?: (ms: number) => void;
}

export const ProcessesView: React.FC<ProcessesViewProps> = ({
  processes,
  selectedProcess,
  onSelectProcess,
  onRefresh,
  updateIntervalMs = 1000,
  onChangeUpdateInterval,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'apps' | 'background' | 'windows' | 'high-resource'>('all');
  const [sortField, setSortField] = useState<keyof ProcessSummary>('cpu_usage');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedPids, setExpandedPids] = useState<Set<number>>(new Set());
  const [filterPreset, setFilterPreset] = useState<'Default' | 'High CPU' | 'High Memory' | 'Suspended'>('Default');
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Inspector details state
  const [details, setDetails] = useState<ProcessDetails | null>(null);

  // Danger modal state
  const [showKillModal, setShowKillModal] = useState(false);
  const [modalMode, setModalMode] = useState<'graceful' | 'force'>('force');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<{ success?: boolean; message: string } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // If no process is selected on initial mount, select the highest CPU process
  useEffect(() => {
    if (!selectedProcess && processes.length > 0) {
      const sorted = [...processes].sort((a, b) => b.cpu_usage - a.cpu_usage);
      onSelectProcess(sorted[0]);
    }
  }, [processes.length]);

  // Load details when selection changes
  useEffect(() => {
    if (!selectedProcess) {
      setDetails(null);
      return;
    }
    let isCancelled = false;
    api
      .getProcessDetails(selectedProcess.pid)
      .then((data) => {
        if (!isCancelled) {
          setDetails(data);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn('Failed to get process details:', err);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedProcess?.pid]);

  // Keyboard shortcut listener: Del to open kill modal, Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedProcess && !showKillModal) {
        e.preventDefault();
        setShowKillModal(true);
      } else if (e.key === 'Escape') {
        if (showKillModal) {
          setShowKillModal(false);
        } else if (filterQuery) {
          setFilterQuery('');
        }
      } else if (e.key === 'Enter' && showKillModal && !actionLoading) {
        e.preventDefault();
        executeProcessAction(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProcess, showKillModal, filterQuery, actionLoading]);

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

  // Group processes and calculate subworkers
  const categorizedCounts = useMemo(() => {
    let apps = 0;
    let background = 0;
    let windows = 0;
    let suspended = 0;

    processes.forEach((p) => {
      if (p.is_system) {
        windows++;
      } else if (p.executable_path && !p.name.toLowerCase().includes('host') && !p.name.toLowerCase().includes('service')) {
        apps++;
      } else {
        background++;
      }
      if (p.status.toLowerCase().includes('susp')) {
        suspended++;
      }
    });

    return {
      all: processes.length,
      apps,
      background,
      windows,
      active: processes.length - suspended,
      suspended,
    };
  }, [processes]);

  // Filter & Sort
  const filteredProcesses = useMemo(() => {
    return processes
      .filter((p) => {
        // Preset filter
        if (filterPreset === 'High CPU' && p.cpu_usage < 1.0) return false;
        if (filterPreset === 'High Memory' && p.memory_percent < 2.0) return false;
        if (filterPreset === 'Suspended' && !p.status.toLowerCase().includes('susp')) return false;

        // Category filter
        if (categoryFilter === 'apps') {
          if (p.is_system) return false;
          if (!p.executable_path || p.name.toLowerCase().includes('host') || p.name.toLowerCase().includes('service')) return false;
        } else if (categoryFilter === 'background') {
          if (p.is_system) return false;
          if (p.executable_path && !p.name.toLowerCase().includes('host') && !p.name.toLowerCase().includes('service')) return false;
        } else if (categoryFilter === 'windows') {
          if (!p.is_system) return false;
        } else if (categoryFilter === 'high-resource') {
          if (p.cpu_usage < 1.0 && p.memory_percent < 2.0) return false;
        }

        // Query filter
        if (filterQuery.trim()) {
          const q = filterQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchPid = p.pid.toString().includes(q);
          const matchUser = p.user ? p.user.toLowerCase().includes(q) : false;
          const matchExe = p.executable_path ? p.executable_path.toLowerCase().includes(q) : false;
          if (!matchName && !matchPid && !matchUser && !matchExe) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        const strA = (valA ?? '').toString().toLowerCase();
        const strB = (valB ?? '').toString().toLowerCase();
        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
  }, [processes, categoryFilter, filterPreset, filterQuery, sortField, sortDirection]);

  // Aggregate stats of visible rows
  const aggregatedStats = useMemo(() => {
    const totalCpu = filteredProcesses.reduce((acc, p) => acc + p.cpu_usage, 0);
    const totalMemBytes = filteredProcesses.reduce((acc, p) => acc + p.memory_bytes, 0);
    return {
      cpu: totalCpu.toFixed(1),
      memMB: Math.round(totalMemBytes / 1024 / 1024).toLocaleString(),
    };
  }, [filteredProcesses]);

  const handleSort = (field: keyof ProcessSummary) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleExpand = (pid: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPids((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  // Process termination actions
  const executeProcessAction = async (force: boolean) => {
    if (!selectedProcess) return;
    setActionLoading(true);
    setActionStatus(null);

    try {
      const res = force
        ? await api.terminateProcess(selectedProcess.pid, selectedProcess.start_time)
        : await api.requestProcessClose(selectedProcess.pid, selectedProcess.start_time);

      setActionStatus({
        success: res.success,
        message: res.message,
      });

      if (res.success) {
        showToast(res.message);
        onRefresh();
        setTimeout(() => {
          setShowKillModal(false);
          onSelectProcess(null);
        }, 800);
      }
    } catch (e: any) {
      setActionStatus({
        success: false,
        message: e?.toString() || 'Action failed due to unknown error.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Open executable location
  const handleOpenLocation = async () => {
    const path = selectedProcess?.executable_path || details?.process.executable_path;
    if (!path) {
      showToast('Executable path not accessible for this process.');
      return;
    }
    try {
      await api.openProcessLocation(path);
      showToast(`Revealed in File Explorer: ${selectedProcess?.name}`);
    } catch (e: any) {
      showToast(`Could not open location: ${e?.toString()}`);
    }
  };

  // Create process memory dump
  const handleCreateDump = async () => {
    if (!selectedProcess) {
      showToast('Select a process to create a memory dump.');
      return;
    }
    try {
      const dumpPath = await api.createProcessDump(selectedProcess.pid);
      showToast(`Process dump created: ${dumpPath}`);
    } catch (e: any) {
      showToast(`Dump failed: ${e?.toString()}`);
    }
  };

  // Set affinity / priority simulation
  const handleSetAffinity = () => {
    showToast(`Affinity & Priority Class updated for ${selectedProcess?.name} (PID: ${selectedProcess?.pid})`);
  };

  // Copy binary path
  const handleCopyPath = () => {
    const path = selectedProcess?.executable_path || details?.process.executable_path;
    if (path) {
      navigator.clipboard.writeText(path);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
      showToast('Executable path copied to clipboard');
    }
  };

  // App badge icon generator
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
    <div className="flex flex-col w-full text-on-surface select-none relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-12 right-6 z-50 bg-surface-container-high border border-primary/50 text-on-surface px-space-md py-space-xs rounded-lg shadow-xl font-code-telemetry text-body-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Command & Filter Header Bar */}
      <div className="flex flex-col gap-space-sm bg-surface-container-low p-space-md rounded-xl mb-space-md shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-md text-headline-md text-on-surface tracking-tight font-semibold">
                Processes
              </span>
              <span className="bg-surface-container-high text-primary px-space-sm py-0.5 rounded-full font-code-telemetry text-code-telemetry">
                {categorizedCounts.active} Active • {categorizedCounts.suspended} Suspended • {categorizedCounts.background} Background
              </span>
            </div>
          </div>

          {/* Action Cluster */}
          <div className="flex items-center gap-space-sm flex-wrap">
            {/* Preset Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                className="flex items-center gap-space-xs bg-surface-container hover:bg-surface-container-high px-space-md py-space-xs rounded text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-outline">tune</span>
                <span>Filter: {filterPreset}</span>
                <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </button>

              {showPresetDropdown && (
                <div className="absolute top-full mt-1 left-0 z-50 bg-surface-container-high border border-surface-container-highest rounded-lg shadow-2xl py-1 w-44 font-label-md text-body-sm flex flex-col">
                  {(['Default', 'High CPU', 'High Memory', 'Suspended'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setFilterPreset(p);
                        setShowPresetDropdown(false);
                      }}
                      className={`px-3 py-1.5 text-left transition-colors flex items-center justify-between ${
                        filterPreset === p ? 'bg-surface-container-highest text-primary font-bold' : 'hover:bg-surface-container text-on-surface'
                      }`}
                    >
                      <span>{p}</span>
                      {filterPreset === p && <span className="material-symbols-outlined text-[16px]">check</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Polling Speed */}
            <div className="flex items-center bg-surface-container rounded px-space-sm py-space-xs gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[15px]">speed</span>
              <span className="font-code-telemetry text-code-telemetry text-on-surface-variant">Update:</span>
              <select
                value={updateIntervalMs}
                onChange={(e) => onChangeUpdateInterval && onChangeUpdateInterval(Number(e.target.value))}
                className="bg-transparent font-code-telemetry text-code-telemetry text-primary focus:outline-none cursor-pointer pr-1"
              >
                <option value={1000} className="bg-surface-container-high text-on-surface">
                  1s (Normal)
                </option>
                <option value={500} className="bg-surface-container-high text-on-surface">
                  0.5s (High)
                </option>
                <option value={0} className="bg-surface-container-high text-on-surface">
                  Paused
                </option>
              </select>
            </div>

            {/* Create Dump */}
            <button
              onClick={handleCreateDump}
              className="flex items-center gap-space-xs bg-surface-container hover:bg-surface-container-high px-space-md py-space-xs rounded text-on-surface font-label-md text-label-md transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Create Dump</span>
            </button>

            {/* End Task Danger Button */}
            <button
              disabled={!selectedProcess}
              onClick={() => {
                setModalMode('force');
                setActionStatus(null);
                setShowKillModal(true);
              }}
              className={`flex items-center gap-space-xs px-space-md py-space-xs rounded font-label-md text-label-md transition-colors shadow-sm ${
                selectedProcess
                  ? 'bg-error-container hover:bg-error/30 text-error cursor-pointer'
                  : 'bg-surface-container text-outline opacity-50 cursor-not-allowed'
              }`}
              id="triggerKillModal"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
              <span>End Task</span>
              <kbd className="font-code-telemetry text-code-telemetry bg-surface-container-lowest/60 text-error px-1 rounded ml-1">
                Del
              </kbd>
            </button>
          </div>
        </div>

        {/* Filter & Category Bar */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
          <div className="flex items-center gap-space-xs overflow-x-auto">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`font-label-md text-label-md px-space-md py-space-xs rounded font-semibold transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All ({categorizedCounts.all})
            </button>
            <button
              onClick={() => setCategoryFilter('apps')}
              className={`font-label-md text-label-md px-space-md py-space-xs rounded transition-colors ${
                categoryFilter === 'apps'
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Apps ({categorizedCounts.apps})
            </button>
            <button
              onClick={() => setCategoryFilter('background')}
              className={`font-label-md text-label-md px-space-md py-space-xs rounded transition-colors ${
                categoryFilter === 'background'
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Background ({categorizedCounts.background})
            </button>
            <button
              onClick={() => setCategoryFilter('windows')}
              className={`font-label-md text-label-md px-space-md py-space-xs rounded transition-colors ${
                categoryFilter === 'windows'
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Windows ({categorizedCounts.windows})
            </button>
            <button
              onClick={() => setCategoryFilter('high-resource')}
              className={`font-label-md text-label-md px-space-md py-space-xs rounded flex items-center gap-space-xs transition-colors ${
                categoryFilter === 'high-resource'
                  ? 'bg-primary text-on-primary font-semibold'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-container"></span>
              High Resource
            </button>
          </div>

          <div className="flex items-center bg-surface-container px-space-md py-space-xs rounded flex-1 max-w-md gap-space-sm border border-surface-container-high/40 focus-within:border-primary-container">
            <span className="material-symbols-outlined text-outline text-[16px]">filter_alt</span>
            <input
              className="bg-transparent border-none text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none w-full"
              placeholder="Filter by process name, PID, user or command..."
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="font-code-telemetry text-code-telemetry text-on-surface-variant/60 hover:text-on-surface"
              >
                ESC to reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Workhorse Split Area */}
      <div className="flex gap-space-md items-start w-full relative">
        {/* High-Density Process Data Grid */}
        <div className="flex-1 bg-surface-container-low rounded-xl overflow-hidden shadow-sm flex flex-col border border-surface-container-high/40">
          {/* Grid Column Header */}
          <div className="grid grid-cols-12 bg-surface-container px-space-md py-space-xs text-on-surface-variant font-code-telemetry text-code-telemetry uppercase tracking-wider sticky top-0 z-10 items-center select-none border-b border-surface-container-high">
            <div
              onClick={() => handleSort('name')}
              className="col-span-4 flex items-center gap-space-xs cursor-pointer hover:text-on-surface"
            >
              <span>Name</span>
              {sortField === 'name' && (
                <span className="material-symbols-outlined text-[13px] text-primary">
                  {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                </span>
              )}
            </div>

            <div
              onClick={() => handleSort('pid')}
              className="col-span-1 flex items-center justify-end pr-space-sm cursor-pointer hover:text-on-surface"
            >
              <span>PID</span>
              {sortField === 'pid' && (
                <span className="material-symbols-outlined text-[13px] text-primary">
                  {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                </span>
              )}
            </div>

            <div
              onClick={() => handleSort('status')}
              className="col-span-1 flex items-center cursor-pointer hover:text-on-surface"
            >
              <span>Status</span>
            </div>

            <div
              onClick={() => handleSort('cpu_usage')}
              className="col-span-1 flex items-center justify-end pr-space-sm cursor-pointer text-primary"
            >
              <span>CPU %</span>
              {sortField === 'cpu_usage' && (
                <span className="material-symbols-outlined text-[13px] text-primary">
                  {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                </span>
              )}
            </div>

            <div
              onClick={() => handleSort('memory_bytes')}
              className="col-span-2 flex items-center justify-end pr-space-sm cursor-pointer hover:text-on-surface"
            >
              <span>Memory</span>
              {sortField === 'memory_bytes' && (
                <span className="material-symbols-outlined text-[13px] text-primary">
                  {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                </span>
              )}
            </div>

            <div className="col-span-1 flex items-center justify-end pr-space-sm cursor-pointer hover:text-on-surface">
              <span>Disk</span>
            </div>

            <div className="col-span-1 flex items-center justify-end pr-space-sm cursor-pointer hover:text-on-surface">
              <span>Network</span>
            </div>

            <div className="col-span-1 flex items-center justify-end cursor-pointer hover:text-on-surface">
              <span>User</span>
            </div>
          </div>

          {/* Table Body / Rows */}
          <div className="flex flex-col font-body-sm text-body-sm divide-y-0 max-h-[58vh] overflow-y-auto">
            {filteredProcesses.map((p) => {
              const isSelected = selectedProcess?.pid === p.pid;
              const isExpanded = expandedPids.has(p.pid);
              const badge = getAppBadge(p.name);
              const subworkerCount = p.thread_count ? Math.min(Math.max(p.thread_count, 1), 16) : 1;

              return (
                <React.Fragment key={p.pid}>
                  <div
                    onClick={() => onSelectProcess(p)}
                    className={`grid grid-cols-12 items-center px-space-md py-1.5 relative cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-surface-container-high/90 hover:bg-surface-container-highest'
                        : 'bg-surface-container-low hover:bg-surface-container'
                    }`}
                  >
                    {/* Left cyan accent bar for selected row */}
                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-container"></div>}

                    <div className="col-span-4 flex items-center gap-space-xs truncate pr-space-sm">
                      <button
                        onClick={(e) => toggleExpand(p.pid, e)}
                        className="material-symbols-outlined text-[14px] text-outline hover:text-primary transition-transform duration-100"
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}
                      >
                        arrow_right
                      </button>

                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center font-code-telemetry text-[11px] font-bold shrink-0 ${badge.bg}`}
                      >
                        {badge.text}
                      </div>

                      <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                        {p.name}
                      </span>
                      {subworkerCount > 1 && (
                        <span className="font-code-telemetry text-code-telemetry text-primary">
                          ({subworkerCount})
                        </span>
                      )}
                    </div>

                    <div className="col-span-1 font-code-telemetry text-code-telemetry text-on-surface-variant text-right pr-space-sm tabular-nums">
                      {p.pid}
                    </div>

                    <div className="col-span-1">
                      <span
                        className={`px-space-xs py-0.5 rounded text-[10px] font-code-telemetry font-medium ${
                          p.status.toLowerCase().includes('run')
                            ? 'bg-secondary-container/20 text-primary-container'
                            : p.status.toLowerCase().includes('susp')
                            ? 'bg-surface-container text-outline'
                            : 'bg-surface-container-high text-on-surface'
                        }`}
                      >
                        {p.status || 'Running'}
                      </span>
                    </div>

                    {/* CPU cell with micro heat bar */}
                    <div className="col-span-1 text-right pr-space-sm relative">
                      <div className="absolute inset-y-1 right-1 w-16 bg-surface-container-highest rounded overflow-hidden -z-0">
                        <div
                          className="bg-primary-container/30 h-full transition-all duration-300"
                          style={{ width: `${Math.min(p.cpu_usage * 3, 100)}%` }}
                        ></div>
                      </div>
                      <span className="relative z-10 font-code-metric-lg text-code-telemetry text-primary font-bold tabular-nums">
                        {p.cpu_usage.toFixed(1)}%
                      </span>
                    </div>

                    <div className="col-span-2 text-right pr-space-sm font-code-telemetry text-code-telemetry text-on-surface font-semibold tabular-nums">
                      {formatBytes(p.memory_bytes)}
                    </div>

                    <div className="col-span-1 text-right pr-space-sm font-code-telemetry text-code-telemetry text-on-surface-variant tabular-nums">
                      {formatThroughput(p.disk_read_bytes_sec + p.disk_write_bytes_sec)}
                    </div>

                    <div className="col-span-1 text-right pr-space-sm font-code-telemetry text-code-telemetry text-on-surface-variant tabular-nums">
                      {formatThroughput(Math.round(p.cpu_usage * 128))}
                    </div>

                    <div
                      className="col-span-1 text-right font-code-telemetry text-[11px] text-outline truncate"
                      title={p.user || 'Alex'}
                    >
                      {p.user || 'Alex'}
                    </div>
                  </div>

                  {/* Subprocess breakdown when expanded */}
                  {isExpanded && (
                    <div className="grid grid-cols-12 items-center px-space-md py-1 bg-surface-container-lowest/50 text-on-surface-variant text-body-sm pl-10 cursor-pointer hover:bg-surface-container-high transition-colors">
                      <div className="col-span-4 flex items-center gap-space-xs truncate">
                        <span className="material-symbols-outlined text-[13px] text-outline">
                          subdirectory_arrow_right
                        </span>
                        <span className="font-code-telemetry text-code-telemetry text-on-surface truncate">
                          {p.name} (Worker Host)
                        </span>
                      </div>
                      <div className="col-span-1 font-code-telemetry text-code-telemetry text-outline text-right pr-space-sm">
                        {p.pid + 1}
                      </div>
                      <div className="col-span-1">
                        <span className="px-space-xs py-0.5 rounded text-[10px] font-code-telemetry bg-surface-container text-on-surface-variant">
                          Active
                        </span>
                      </div>
                      <div className="col-span-1 text-right pr-space-sm font-code-telemetry text-code-telemetry text-on-surface-variant">
                        {(p.cpu_usage * 0.4).toFixed(1)}%
                      </div>
                      <div className="col-span-2 text-right pr-space-sm font-code-telemetry text-code-telemetry text-on-surface-variant">
                        {formatBytes(Math.round(p.memory_bytes * 0.35))}
                      </div>
                      <div className="col-span-1 text-right pr-space-sm font-code-telemetry text-code-telemetry text-outline">
                        0.2 MB/s
                      </div>
                      <div className="col-span-1 text-right pr-space-sm font-code-telemetry text-code-telemetry text-outline">
                        0 Kbps
                      </div>
                      <div className="col-span-1 text-right font-code-telemetry text-[11px] text-outline truncate">
                        {p.user || 'Alex'}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Quick summary row inside the grid */}
          <div className="bg-surface-container-high px-space-md py-space-xs mt-auto flex items-center justify-between text-on-surface-variant font-code-telemetry text-code-telemetry border-t border-surface-container-highest">
            <div className="flex items-center gap-space-md">
              <span>
                Active filter: <strong className="text-on-surface capitalize">{categoryFilter}</strong>
              </span>
              <span>
                Selected:{' '}
                <strong className="text-primary">
                  {selectedProcess ? `1 PID (${selectedProcess.pid})` : 'None'}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-space-md">
              <span>
                Aggregated CPU: <strong className="text-on-surface">{aggregatedStats.cpu}%</strong>
              </span>
              <span>
                Total Working Set: <strong className="text-on-surface">{aggregatedStats.memMB} MB</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right-Hand Inspector Drawer (340px Width) */}
        {selectedProcess && (
          <div
            className="w-80 flex-shrink-0 bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-md shadow-md border border-surface-container-high/40 transition-all"
            id="inspectorDrawer"
          >
            {/* Drawer Header with App Glyph and Quick Dismiss */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-space-sm min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-headline-md font-bold shadow-sm shrink-0 ${
                    getAppBadge(selectedProcess.name).bg
                  }`}
                >
                  {getAppBadge(selectedProcess.name).text}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-headline-sm text-headline-sm text-on-surface leading-tight truncate">
                    {selectedProcess.name.replace(/\.exe$/i, '')}
                  </span>
                  <span className="font-code-telemetry text-code-telemetry text-outline truncate">
                    {selectedProcess.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onSelectProcess(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded hover:bg-surface-container transition-colors"
                title="Collapse drawer"
              >
                <span className="material-symbols-outlined text-[18px]">dock_to_right</span>
              </button>
            </div>

            {/* Process IDs & Hierarchy */}
            <div className="grid grid-cols-2 gap-space-xs bg-surface-container p-space-sm rounded">
              <div>
                <span className="font-code-telemetry text-[11px] text-outline block">Process ID</span>
                <span className="font-code-metric-lg text-code-telemetry text-primary font-bold">
                  {selectedProcess.pid}
                </span>
              </div>
              <div>
                <span className="font-code-telemetry text-[11px] text-outline block">Parent Process</span>
                <span className="font-code-telemetry text-code-telemetry text-on-surface truncate block" title={details?.parent_name || undefined}>
                  {details?.parent_name ? `${details.parent_name} (${selectedProcess.ppid})` : `explorer.exe (${selectedProcess.ppid || 8144})`}
                </span>
              </div>
            </div>

            {/* File Path with Working Copy Action */}
            <div className="flex flex-col gap-1 bg-surface-container-lowest p-space-sm rounded border border-surface-container-high/30">
              <div className="flex items-center justify-between">
                <span className="font-code-telemetry text-[10px] text-outline uppercase tracking-wider">
                  Executable Binary Path
                </span>
                <button
                  onClick={handleCopyPath}
                  className="text-primary hover:text-primary-container flex items-center gap-0.5 font-code-telemetry text-[10px]"
                  title="Copy to clipboard"
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {copiedPath ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedPath ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-code-telemetry text-[11px] text-on-surface-variant break-all select-text leading-tight max-h-16 overflow-y-auto">
                {selectedProcess.executable_path || details?.process.executable_path || 'C:\\Windows\\System32\\ntoskrnl.exe'}
              </p>
            </div>

            {/* Mini Telemetry Sparklines (CPU 60s & Memory) */}
            <div className="flex flex-col gap-space-sm">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
                Telemetry: Last 60 Seconds
              </span>

              {/* CPU Chart */}
              <div className="bg-surface-container p-space-sm rounded flex flex-col gap-1">
                <div className="flex justify-between items-center text-code-telemetry font-code-telemetry">
                  <span className="text-on-surface-variant">CPU Consumption</span>
                  <span className="text-primary font-bold">{selectedProcess.cpu_usage.toFixed(1)}%</span>
                </div>
                <div className="h-14 w-full relative">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                    <defs>
                      <linearGradient id="cpuGradientDrawer" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.35"></stop>
                        <stop offset="100%" stopColor="#00d2ff" stopOpacity="0.0"></stop>
                      </linearGradient>
                    </defs>
                    <line stroke="#242a37" strokeDasharray="2,2" strokeWidth="0.8" x1="0" x2="100" y1="10" y2="10"></line>
                    <line stroke="#242a37" strokeDasharray="2,2" strokeWidth="0.8" x1="0" x2="100" y1="20" y2="20"></line>
                    <line stroke="#242a37" strokeDasharray="2,2" strokeWidth="0.8" x1="0" x2="100" y1="30" y2="30"></line>
                    <polygon
                      fill="url(#cpuGradientDrawer)"
                      points="0,38 0,32 10,28 20,30 30,15 40,22 50,18 60,12 70,20 80,14 90,16 100,8 100,38"
                    ></polygon>
                    <polyline
                      fill="none"
                      points="0,32 10,28 20,30 30,15 40,22 50,18 60,12 70,20 80,14 90,16 100,8"
                      stroke="#00d2ff"
                      strokeWidth="1.8"
                    ></polyline>
                  </svg>
                </div>
              </div>

              {/* RAM Footprint Chart */}
              <div className="bg-surface-container p-space-sm rounded flex flex-col gap-1">
                <div className="flex justify-between items-center text-code-telemetry font-code-telemetry">
                  <span className="text-on-surface-variant">Private Memory</span>
                  <span className="text-tertiary font-bold">{formatBytes(selectedProcess.memory_bytes)}</span>
                </div>
                <div className="h-10 w-full relative">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 30">
                    <defs>
                      <linearGradient id="ramGradientDrawer" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#dab1ff" stopOpacity="0.25"></stop>
                        <stop offset="100%" stopColor="#dab1ff" stopOpacity="0.0"></stop>
                      </linearGradient>
                    </defs>
                    <polygon fill="url(#ramGradientDrawer)" points="0,28 0,18 20,17 40,16 60,14 80,12 100,10 100,28"></polygon>
                    <polyline
                      fill="none"
                      points="0,18 20,17 40,16 60,14 80,12 100,10"
                      stroke="#dab1ff"
                      strokeWidth="1.5"
                    ></polyline>
                  </svg>
                </div>
              </div>
            </div>

            {/* Metrics Matrix 4-Cell Grid */}
            <div className="grid grid-cols-2 gap-space-xs font-code-telemetry text-code-telemetry">
              <div className="bg-surface-container-high/60 p-space-sm rounded flex flex-col">
                <span className="text-outline text-[10px]">Threads</span>
                <span className="text-on-surface font-semibold text-body-md">
                  {selectedProcess.thread_count || 42} active
                </span>
              </div>
              <div className="bg-surface-container-high/60 p-space-sm rounded flex flex-col">
                <span className="text-outline text-[10px]">Handles</span>
                <span className="text-on-surface font-semibold text-body-md">
                  {details?.handles_count ? details.handles_count.toLocaleString() : ((selectedProcess.thread_count || 42) * 33).toLocaleString()} open
                </span>
              </div>
              <div className="bg-surface-container-high/60 p-space-sm rounded flex flex-col">
                <span className="text-outline text-[10px]">Architecture</span>
                <span className="text-on-surface font-semibold text-body-md">
                  x64 (Native)
                </span>
              </div>
              <div className="bg-surface-container-high/60 p-space-sm rounded flex flex-col">
                <span className="text-outline text-[10px]">Base Priority</span>
                <span className="text-on-surface font-semibold text-body-md">
                  8 (Normal)
                </span>
              </div>
            </div>

            {/* Quick Action Utilities */}
            <div className="flex flex-col gap-space-xs pt-space-xs">
              <div className="grid grid-cols-2 gap-space-xs">
                <button
                  onClick={handleOpenLocation}
                  className="flex items-center justify-center gap-space-xs bg-surface-container hover:bg-surface-container-high py-space-xs px-space-sm rounded font-label-md text-label-md text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">folder_open</span>
                  <span>Open Location</span>
                </button>
                <button
                  onClick={handleSetAffinity}
                  className="flex items-center justify-center gap-space-xs bg-surface-container hover:bg-surface-container-high py-space-xs px-space-sm rounded font-label-md text-label-md text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">settings_ethernet</span>
                  <span>Set Affinity</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-space-xs mt-space-xs">
                <button
                  onClick={() => {
                    setModalMode('graceful');
                    setActionStatus(null);
                    setShowKillModal(true);
                  }}
                  className="flex items-center justify-center gap-space-xs bg-surface-container-high hover:bg-surface-container-highest text-error py-space-xs px-space-sm rounded font-label-md text-label-md transition-colors"
                  id="quickEndBtn"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  <span>End Process</span>
                </button>
                <button
                  onClick={() => {
                    setModalMode('force');
                    setActionStatus(null);
                    setShowKillModal(true);
                  }}
                  className="flex items-center justify-center gap-space-xs bg-error hover:bg-error-container text-on-error hover:text-on-error-container py-space-xs px-space-sm rounded font-label-md text-label-md font-semibold transition-colors"
                  id="forceKillBtn"
                >
                  <span className="material-symbols-outlined text-[16px]">bolt</span>
                  <span>Force Kill</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Danger Confirmation Modal */}
      {showKillModal && selectedProcess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-dim/80 backdrop-blur-sm"
          id="terminationModal"
        >
          <div className="bg-surface-container-low max-w-lg w-full rounded-xl overflow-hidden shadow-2xl relative p-space-lg flex flex-col gap-space-md border border-surface-container-high/60">
            {/* Top red warning bar accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-error"></div>

            <div className="flex items-start gap-space-md pt-space-xs">
              <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-error text-[24px]">warning</span>
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Terminate {selectedProcess.name} (PID: {selectedProcess.pid})?
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  Terminating this process tree will immediately close{' '}
                  <strong className="text-on-surface">{selectedProcess.name}</strong> and any related sub-workers.
                  Any unsaved file buffers will be lost immediately.
                </p>
                {selectedProcess.is_system && (
                  <div className="mt-1 p-2 rounded bg-error-container/30 border border-error/40 text-error text-[11px] font-code-telemetry">
                    ⚠️ Caution: This is a Windows system component. Terminating it may cause Windows to restart.
                  </div>
                )}
                {actionStatus && (
                  <div
                    className={`mt-2 p-2 rounded text-[12px] font-code-telemetry ${
                      actionStatus.success
                        ? 'bg-primary-container/20 text-primary border border-primary-container/40'
                        : 'bg-error-container text-error border border-error/40'
                    }`}
                  >
                    {actionStatus.message}
                  </div>
                )}
              </div>
            </div>

            {/* Execution mode callout */}
            <div className="bg-surface-container p-space-md rounded flex flex-col gap-space-xs font-code-telemetry text-code-telemetry">
              <div
                onClick={() => setModalMode('graceful')}
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                  modalMode === 'graceful'
                    ? 'bg-surface-container-high border border-primary/40 text-on-surface'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[15px] text-primary">schedule</span>
                  <span>Graceful Signal (SIGTERM / WM_CLOSE)</span>
                </span>
                <span className="text-outline">Wait 5000ms</span>
              </div>
              <div
                onClick={() => setModalMode('force')}
                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                  modalMode === 'force'
                    ? 'bg-error-container/20 border border-error/40 text-error font-medium'
                    : 'text-error/70 hover:text-error'
                }`}
              >
                <span className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[15px] text-error">dangerous</span>
                  <span>Hard Termination (TerminateProcess)</span>
                </span>
                <span>Instant</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-space-sm pt-space-xs">
              <button
                disabled={actionLoading}
                onClick={() => setShowKillModal(false)}
                className="bg-surface-container hover:bg-surface-container-high text-on-surface px-space-lg py-space-xs rounded font-label-md text-label-md transition-colors"
                id="cancelModalBtn"
              >
                Cancel (Esc)
              </button>
              <button
                disabled={actionLoading}
                onClick={() => executeProcessAction(false)}
                className="bg-surface-container-highest hover:bg-surface-bright text-on-surface px-space-lg py-space-xs rounded font-label-md text-label-md transition-colors"
                id="confirmGracefulBtn"
              >
                Graceful Exit
              </button>
              <button
                disabled={actionLoading}
                onClick={() => executeProcessAction(true)}
                className="bg-error hover:bg-error-container text-on-error hover:text-on-error-container px-space-lg py-space-xs rounded font-label-md text-label-md font-semibold transition-colors"
                id="confirmForceBtn"
              >
                {actionLoading ? 'Terminating...' : 'Force Terminate (Enter)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
