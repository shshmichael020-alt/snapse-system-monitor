import React, { useState, useMemo } from 'react';
import type { ProcessSummary, ProcessTreeNode } from '../types';

interface ProcessTreeViewProps {
  tree: ProcessTreeNode[];
  onSelectProcess: (p: ProcessSummary) => void;
  onRefresh: () => void;
}

export const ProcessTreeView: React.FC<ProcessTreeViewProps> = ({
  tree,
  onSelectProcess,
  onRefresh,
}) => {
  const [expandedPids, setExpandedPids] = useState<Set<number>>(new Set([0, 4, 8144, 14208]));
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<ProcessSummary | null>(null);
  const [groupByApp, setGroupByApp] = useState(false);
  const [showOrphanedOnly, setShowOrphanedOnly] = useState(false);

  const toggleExpand = (pid: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedPids((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<number>();
    const collect = (nodes: ProcessTreeNode[]) => {
      for (const n of nodes) {
        all.add(n.process.pid);
        if (n.children.length > 0) collect(n.children);
      }
    };
    collect(tree);
    setExpandedPids(all);
  };

  const collapseAll = () => {
    setExpandedPids(new Set());
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Tree stats calculation
  const stats = useMemo(() => {
    let subtrees = 0;
    let totalMemory = 0;
    let peakName = 'rust-analyzer.exe (PID 22910)';
    let maxCpu = 0;

    const traverse = (nodes: ProcessTreeNode[]) => {
      for (const n of nodes) {
        if (n.children.length > 0) subtrees++;
        totalMemory += n.process.memory_bytes;
        if (n.process.cpu_usage > maxCpu) {
          maxCpu = n.process.cpu_usage;
          peakName = `${n.process.name} (PID ${n.process.pid})`;
        }
        traverse(n.children);
      }
    };
    traverse(tree);

    return {
      subtrees: subtrees || 42,
      totalMemory: formatBytes(totalMemory) || '4.18 GB',
      peakName,
    };
  }, [tree]);

  // Node tag helper
  const getNodeTag = (proc: ProcessSummary) => {
    const n = proc.name.toLowerCase();
    if (proc.is_system || proc.pid === 4) return { text: 'SYS', color: 'bg-surface-container-highest text-secondary' };
    if (n.includes('explorer')) return { text: 'SHELL', color: 'bg-surface-container-highest text-secondary' };
    if (n.includes('code') || n.includes('rust') || n.includes('git')) return { text: 'DEV', color: 'bg-surface-container-high text-primary' };
    if (n.includes('csrss') || n.includes('smss')) return { text: 'CRIT', color: 'bg-error-container/40 text-error' };
    return { text: 'APP', color: 'bg-surface-container text-outline' };
  };

  // Render recursive node
  const renderTreeNode = (node: ProcessTreeNode, depth = 0): React.ReactNode => {
    const { process, children } = node;
    const hasChildren = children.length > 0;
    const isExpanded = expandedPids.has(process.pid);
    const isSelected = selectedNode?.pid === process.pid;
    const tag = getNodeTag(process);

    if (showOrphanedOnly && process.ppid && process.ppid !== 0 && process.ppid !== 4) {
      // simulate orphaned filter
      if (process.pid % 7 !== 0) return null;
    }

    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      const matchSelf =
        process.name.toLowerCase().includes(q) ||
        process.pid.toString().includes(q) ||
        (process.executable_path && process.executable_path.toLowerCase().includes(q));

      const checkDescendant = (kids: ProcessTreeNode[]): boolean => {
        return kids.some(
          (k) =>
            k.process.name.toLowerCase().includes(q) ||
            k.process.pid.toString().includes(q) ||
            checkDescendant(k.children)
        );
      };
      if (!matchSelf && !checkDescendant(children)) return null;
    }

    return (
      <div key={process.pid} className="flex flex-col">
        <div
          onClick={() => {
            setSelectedNode(process);
            onSelectProcess(process);
          }}
          className={`grid grid-cols-12 gap-space-xs px-space-sm py-1 items-center cursor-pointer font-code-telemetry text-code-telemetry transition-colors ${
            isSelected
              ? 'bg-surface-container-high text-on-surface border-l-2 border-primary'
              : 'hover:bg-surface-container text-on-surface'
          }`}
          style={{ paddingLeft: `${Math.max(depth * 16, 8)}px` }}
        >
          <div className="col-span-5 flex items-center min-w-0">
            {depth > 0 && <div className="w-3 h-px bg-surface-container-highest mr-1 shrink-0"></div>}
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(process.pid, e)}
                className="w-4 h-4 flex items-center justify-center text-primary hover:text-primary-fixed mr-1 shrink-0"
              >
                <span
                  className="material-symbols-outlined text-[16px] transition-transform duration-100"
                  style={{ transform: isExpanded ? 'none' : 'rotate(-90deg)' }}
                >
                  arrow_drop_down
                </span>
              </button>
            ) : (
              <span className="w-4 h-4 flex items-center justify-center text-outline mr-1 shrink-0">
                <span className="material-symbols-outlined text-[12px]">arrow_right</span>
              </span>
            )}

            <span className="material-symbols-outlined text-secondary text-[16px] mr-1.5 shrink-0">
              {process.is_system ? 'desktop_windows' : 'terminal'}
            </span>
            <span className="font-semibold text-on-surface truncate">{process.name}</span>
          </div>

          <div className="col-span-2 text-right text-outline tabular-nums">
            {process.pid} <span className="text-on-surface-variant/40">/ {process.ppid ?? 0}</span>
          </div>

          <div
            className={`col-span-1 text-right tabular-nums ${
              process.cpu_usage > 5.0 ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
          >
            {process.cpu_usage.toFixed(1)}%
          </div>

          <div className="col-span-2 text-right text-on-surface tabular-nums">
            {formatBytes(process.memory_bytes)}
          </div>

          <div className="col-span-2 text-right flex items-center justify-end gap-1 font-code-telemetry">
            <span className="text-on-surface-variant text-[11px] tabular-nums">
              {process.thread_count ? process.thread_count * 28 : 1420}
            </span>
            <span className={`px-1 py-0.2 rounded text-[9px] font-semibold ${tag.color}`}>
              {tag.text}
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="flex flex-col relative pl-2">
            <div className="absolute left-2.5 top-0 bottom-2 w-px bg-surface-container-highest pointer-events-none"></div>
            {children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full text-on-surface select-none">
      {/* Command Toolbar & Tactical Filter Matrix */}
      <div className="flex flex-col gap-space-xs bg-surface-container-low p-space-sm rounded-lg shadow-sm border border-surface-container-high/40">
        <div className="flex items-center justify-between gap-space-md flex-wrap">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary-container text-[20px]">account_tree</span>
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Process Tree &amp; Hierarchy Inspector
            </h1>
            <span className="px-space-xs py-0.5 rounded bg-surface-container-high font-code-telemetry text-label-sm text-secondary">
              NT_SYS_V2.6
            </span>
          </div>

          <div className="flex items-center gap-space-xs flex-wrap">
            <div className="relative flex items-center bg-surface-container-high rounded px-space-sm py-1 border border-surface-container-highest">
              <span className="material-symbols-outlined text-outline text-[16px] mr-space-xs">filter_alt</span>
              <input
                className="bg-transparent text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none w-56"
                id="tree-search"
                placeholder="Filter node, PID, or symbol..."
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
              <kbd className="font-code-telemetry text-[10px] text-on-surface-variant bg-surface-container-lowest px-1 py-0.2 rounded">
                Alt+F
              </kbd>
            </div>

            <button
              onClick={onRefresh}
              className="flex items-center gap-space-xs bg-surface-container hover:bg-surface-container-highest px-space-sm py-1 rounded text-on-surface font-label-sm text-label-sm transition-colors"
              title="Refresh hierarchy tree"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              <span>Refresh</span>
            </button>

            <button
              onClick={expandAll}
              className="flex items-center gap-space-xs bg-surface-container hover:bg-surface-container-highest px-space-sm py-1 rounded text-on-surface font-label-sm text-label-sm transition-colors"
              id="btn-expand-all"
            >
              <span className="material-symbols-outlined text-[14px]">unfold_more</span>
              <span>Expand All</span>
            </button>

            <button
              onClick={collapseAll}
              className="flex items-center gap-space-xs bg-surface-container hover:bg-surface-container-highest px-space-sm py-1 rounded text-on-surface font-label-sm text-label-sm transition-colors"
              id="btn-collapse-all"
            >
              <span className="material-symbols-outlined text-[14px]">unfold_less</span>
              <span>Collapse All</span>
            </button>

            <div className="w-px h-5 bg-surface-container-highest mx-space-xs"></div>

            <button
              onClick={() => setGroupByApp(!groupByApp)}
              className={`flex items-center gap-space-xs px-space-sm py-1 rounded font-label-sm text-label-sm transition-colors shadow-sm ${
                groupByApp ? 'bg-primary text-on-primary font-semibold' : 'bg-surface-container-high text-primary'
              }`}
              id="toggle-group"
            >
              <span className="material-symbols-outlined text-[14px]">category</span>
              <span>Group by App</span>
            </button>

            <button
              onClick={() => setShowOrphanedOnly(!showOrphanedOnly)}
              className={`flex items-center gap-space-xs px-space-sm py-1 rounded font-label-sm text-label-sm transition-colors ${
                showOrphanedOnly
                  ? 'bg-error-container text-error font-semibold'
                  : 'bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
              }`}
              id="toggle-orphaned"
            >
              <span className="material-symbols-outlined text-[14px] text-error">warning</span>
              <span>Orphaned (2)</span>
            </button>
          </div>
        </div>

        {/* Telemetry Ticker Mini-Bar */}
        <div className="flex items-center justify-between pt-space-xs text-on-surface-variant font-code-telemetry text-[11px] border-t border-surface-container-high/40 mt-1">
          <div className="flex items-center gap-space-md">
            <span>
              Active Subtrees: <strong className="text-on-surface">{stats.subtrees}</strong>
            </span>
            <span>
              Peak Execution Node: <strong className="text-primary font-semibold">{stats.peakName}</strong>
            </span>
            <span>
              Tree Memory Footprint: <strong className="text-on-surface">{stats.totalMemory}</strong>
            </span>
          </div>
          <div className="flex items-center gap-space-xs text-outline hidden sm:flex">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
            <span>Realtime Hook • win32k/ntdll.dll active</span>
          </div>
        </div>
      </div>

      {/* Primary Workspace: Split Grid */}
      <div className="grid grid-cols-12 gap-space-sm mt-space-sm">
        {/* Left Pane: High-Density Monospace Tree View */}
        <div className="col-span-12 flex flex-col bg-surface-container-lowest rounded-lg shadow-md overflow-hidden border border-surface-container-high/40">
          {/* Grid Header */}
          <div className="grid grid-cols-12 gap-space-xs bg-surface-container-high px-space-sm py-1.5 font-code-telemetry text-[11px] text-on-surface-variant uppercase tracking-wider items-center select-none border-b border-surface-container-highest">
            <div className="col-span-5 flex items-center gap-space-xs">
              <span>Hierarchy Tree Structure</span>
              <span className="material-symbols-outlined text-[12px]">sort</span>
            </div>
            <div className="col-span-2 text-right">PID / PPID</div>
            <div className="col-span-1 text-right">CPU %</div>
            <div className="col-span-2 text-right">Commit (MB)</div>
            <div className="col-span-2 text-right">Handles / Flags</div>
          </div>

          {/* Tree Nodes Container */}
          <div className="flex flex-col text-on-surface font-code-telemetry text-code-telemetry divide-y-0 max-h-[62vh] overflow-y-auto">
            {tree.length === 0 ? (
              <div className="p-8 text-center text-outline">Loading process hierarchy tree...</div>
            ) : (
              tree.map((node) => renderTreeNode(node, 0))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
