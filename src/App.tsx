import React, { useEffect, useRef, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar, type TabId } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { OverviewView } from './views/OverviewView';
import { ProcessesView } from './views/ProcessesView';
import { PerformanceView } from './views/PerformanceView';
import { ProcessTreeView } from './views/ProcessTreeView';
import { StartupAppsView } from './views/StartupAppsView';
import { ServicesView } from './views/ServicesView';
import { AlertsView } from './views/AlertsView';
import { Resource3DView } from './views/Resource3DView';
import { SettingsView } from './views/SettingsView';
import { api } from './services/api';
import type {
  AlertEvent,
  AppSettings,
  ProcessSummary,
  ProcessTreeNode,
  SystemHistoryPoint,
  SystemSnapshot,
} from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabId>('overview');
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [processes, setProcesses] = useState<ProcessSummary[]>([]);
  const [processTree, setProcessTree] = useState<ProcessTreeNode[]>([]);
  const [history, setHistory] = useState<SystemHistoryPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    refresh_interval_ms: 1000,
    history_window_seconds: 60,
    theme: 'dark',
    alert_cpu_threshold: 85,
    alert_cpu_duration_seconds: 5,
    alert_memory_threshold: 90,
    alert_memory_duration_seconds: 5,
    adaptive_monitoring_enabled: false,
    enable_3d_view: true,
    visible_columns: ['name', 'pid', 'status', 'cpu', 'memory', 'disk', 'network', 'user'],
  });

  const [selectedProcess, setSelectedProcess] = useState<ProcessSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load initial settings
  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        if (s && s.refresh_interval_ms) {
          setSettings(s);
        }
      })
      .catch((e) => console.warn('Could not load settings:', e));
  }, []);

  // Central Polling Engine
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let isFetching = false;

    const poll = async () => {
      if (isPaused || isFetching) return;
      isFetching = true;

      try {
        const snapPromise = api.getSystemSnapshot();
        const procPromise = api.getProcesses();
        const histPromise = api.getSystemHistory(settings.history_window_seconds || 60);
        const alertPromise = api.getAlerts();

        const [snap, procs, hist, alts] = await Promise.all([
          snapPromise,
          procPromise,
          histPromise,
          alertPromise,
        ]);

        setSnapshot(snap);
        setProcesses(procs);
        setHistory(hist);
        setAlerts(alts);

        // If tree tab is active, also update tree
        if (currentTab === 'process-tree') {
          api.getProcessTree().then((tree) => setProcessTree(tree)).catch(() => {});
        }
      } catch (err) {
        console.warn('Telemetry polling error:', err);
      } finally {
        isFetching = false;
      }
    };

    // Initial immediate sample
    poll();

    // Determine interval (adaptive monitoring support)
    let interval = settings.refresh_interval_ms || 1000;
    if (settings.adaptive_monitoring_enabled && snapshot) {
      if (snapshot.cpu.total_usage_percent < 10.0 && currentTab !== 'performance') {
        interval = Math.max(interval, 2000);
      }
    }

    timer = setInterval(poll, interval);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPaused, settings.refresh_interval_ms, settings.history_window_seconds, settings.adaptive_monitoring_enabled, currentTab]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerManualRefresh = async () => {
    try {
      const [snap, procs, hist, alts] = await Promise.all([
        api.getSystemSnapshot(),
        api.getProcesses(),
        api.getSystemHistory(settings.history_window_seconds || 60),
        api.getAlerts(),
      ]);
      setSnapshot(snap);
      setProcesses(procs);
      setHistory(hist);
      setAlerts(alts);
      if (currentTab === 'process-tree') {
        const tree = await api.getProcessTree();
        setProcessTree(tree);
      }
    } catch (e) {
      console.warn('Manual refresh failed:', e);
    }
  };

  const activeAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="flex flex-col w-screen h-screen bg-surface font-body-md text-on-surface overflow-hidden select-none">
      {/* Fixed TitleBar with Window Controls & Telemetry */}
      <TitleBar
        snapshot={snapshot}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchRef={searchInputRef}
      />

      {/* Main Container */}
      <div className="flex flex-1 pt-9 pb-7 overflow-hidden">
        {/* Navigation Rail */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'compact-mode') {
              setCurrentTab(currentTab === 'compact-mode' ? 'overview' : 'compact-mode');
            } else {
              setCurrentTab(tab);
            }
          }}
          alertCount={activeAlertsCount}
        />

        {/* Viewport Content */}
        <main className="flex-1 ml-52 p-space-md overflow-y-auto bg-surface">
          {currentTab === 'overview' && (
            <OverviewView
              snapshot={snapshot}
              history={history}
              processes={processes}
              isPaused={isPaused}
              onTogglePause={() => setIsPaused(!isPaused)}
              onSelectProcess={(p) => {
                setSelectedProcess(p);
                setCurrentTab('processes');
              }}
              onNavigateTab={setCurrentTab}
            />
          )}

          {currentTab === 'processes' && (
            <ProcessesView
              processes={processes}
              selectedProcess={selectedProcess}
              onSelectProcess={setSelectedProcess}
              onRefresh={triggerManualRefresh}
              updateIntervalMs={isPaused ? 0 : settings.refresh_interval_ms}
              onChangeUpdateInterval={(ms) => {
                if (ms === 0) {
                  setIsPaused(true);
                } else {
                  setIsPaused(false);
                  setSettings((prev) => ({ ...prev, refresh_interval_ms: ms }));
                }
              }}
            />
          )}

          {currentTab === 'performance' && (
            <PerformanceView
              snapshot={snapshot}
              history={history}
              isPaused={isPaused}
              onTogglePause={() => setIsPaused(!isPaused)}
            />
          )}

          {currentTab === 'process-tree' && (
            <ProcessTreeView
              tree={processTree}
              onSelectProcess={(p) => setSelectedProcess(p)}
              onRefresh={triggerManualRefresh}
            />
          )}

          {currentTab === 'startup-apps' && (
            <StartupAppsView processes={processes} />
          )}

          {currentTab === 'services' && (
            <ServicesView processes={processes} />
          )}

          {currentTab === 'history-and-alerts' && (
            <AlertsView alerts={alerts} onRefresh={triggerManualRefresh} />
          )}

          {currentTab === 'resource-3d' && (
            <Resource3DView processes={processes} />
          )}

          {currentTab === 'compact-mode' && (
            <div className="flex flex-col gap-space-md max-w-xl">
              <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-lg border border-surface-container-high">
                <span className="font-headline-sm text-body-md font-semibold text-primary">
                  Snapse Compact Diagnostic Mode
                </span>
                <button
                  onClick={() => setCurrentTab('overview')}
                  className="px-2 py-0.5 rounded bg-surface-container font-label-sm text-[11px] text-on-surface"
                >
                  Return to Full
                </button>
              </div>
              <div className="grid grid-cols-2 gap-space-sm">
                <div className="bg-surface-container-low p-space-sm rounded-lg border border-primary/40 flex flex-col">
                  <span className="text-[11px] text-outline uppercase font-semibold">CPU Utilization</span>
                  <span className="font-code-metric-lg text-headline-md text-primary font-bold">
                    {snapshot ? snapshot.cpu.total_usage_percent.toFixed(1) : '--'}%
                  </span>
                </div>
                <div className="bg-surface-container-low p-space-sm rounded-lg border border-tertiary/40 flex flex-col">
                  <span className="text-[11px] text-outline uppercase font-semibold">Physical RAM</span>
                  <span className="font-code-metric-lg text-headline-md text-tertiary font-bold">
                    {snapshot ? snapshot.memory.used_percent.toFixed(1) : '--'}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={setSettings}
            />
          )}
        </main>
      </div>

      {/* Fixed Persistent Bottom Status Bar from Stitch */}
      <StatusBar snapshot={snapshot} processes={processes} />
    </div>
  );
};
