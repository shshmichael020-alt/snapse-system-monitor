import React, { useState } from 'react';
import { api } from '../services/api';
import type { AppSettings } from '../types';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      await api.saveSettings(localSettings);
      onUpdateSettings(localSettings);
      setSaveStatus('Settings successfully saved and persisted.');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e: any) {
      setSaveStatus(`Failed to save settings: ${e?.toString()}`);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      setExportStatus(`Generating ${format.toUpperCase()} snapshot...`);
      const data = await api.exportSnapshot(format);

      // Trigger browser/webview download
      const blob = new Blob([data], {
        type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `snapse_snapshot_${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportStatus(`Exported ${format.toUpperCase()} successfully!`);
      setTimeout(() => setExportStatus(null), 3500);
    } catch (e: any) {
      setExportStatus(`Export failed: ${e?.toString()}`);
    }
  };

  return (
    <div className="flex flex-col w-full text-on-surface select-none gap-space-md max-w-4xl">
      {/* Top Banner */}
      <div className="flex items-center justify-between p-space-md bg-surface-container-low rounded-xl border border-surface-container-high/40 shadow-sm">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary text-[24px]">settings</span>
          <div className="flex flex-col">
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Snapse Settings &amp; Diagnostics Configuration
            </h1>
            <span className="font-code-telemetry text-body-sm text-on-surface-variant">
              Locally persisted engine parameters (No cloud telemetry)
            </span>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-space-xs px-space-md py-1.5 rounded bg-primary text-on-primary font-label-md text-label-md font-semibold transition-all shadow-sm hover:bg-primary-fixed"
        >
          <span className="material-symbols-outlined text-[16px]">save</span>
          <span>Save Changes</span>
        </button>
      </div>

      {saveStatus && (
        <div className="p-space-sm rounded bg-primary-container/20 border border-primary-container/50 text-primary font-code-telemetry text-body-sm">
          {saveStatus}
        </div>
      )}

      {/* 1. Monitoring & Polling Settings */}
      <div className="flex flex-col bg-surface-container-low p-space-md rounded-xl border border-surface-container-high/40 shadow-sm gap-space-sm">
        <h2 className="font-headline-sm text-body-lg text-on-surface font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">speed</span>
          Telemetry Engine Timing
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-2">
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-on-surface font-medium">
              Refresh Interval (Polling Speed)
            </label>
            <span className="text-on-surface-variant text-[12px]">
              How frequently the Rust engine samples CPU, RAM, disk, and processes.
            </span>
            <select
              value={localSettings.refresh_interval_ms}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, refresh_interval_ms: Number(e.target.value) })
              }
              className="mt-1 bg-surface-container border border-surface-container-high p-2 rounded text-on-surface font-code-telemetry text-body-sm focus:border-primary focus:outline-none"
            >
              <option value={500}>500 ms (High Performance)</option>
              <option value={1000}>1,000 ms (Default / Balanced)</option>
              <option value={2000}>2,000 ms (Low Resource Consumption)</option>
              <option value={5000}>5,000 ms (Battery Saver)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-md text-on-surface font-medium">
              Live History Buffer Range
            </label>
            <span className="text-on-surface-variant text-[12px]">
              Maximum duration retained in real-time continuous memory ring buffer.
            </span>
            <select
              value={localSettings.history_window_seconds}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, history_window_seconds: Number(e.target.value) })
              }
              className="mt-1 bg-surface-container border border-surface-container-high p-2 rounded text-on-surface font-code-telemetry text-body-sm focus:border-primary focus:outline-none"
            >
              <option value={30}>30 Seconds</option>
              <option value={60}>60 Seconds (Default)</option>
              <option value={300}>5 Minutes</option>
              <option value={900}>15 Minutes</option>
            </select>
          </div>
        </div>

        {/* Adaptive Monitoring Toggle */}
        <div className="flex items-center justify-between p-space-sm bg-surface-container rounded-lg border border-surface-container-high/60 mt-2">
          <div className="flex flex-col">
            <span className="font-label-md text-on-surface font-medium">
              Experimental Adaptive Monitoring Mode
            </span>
            <span className="text-on-surface-variant text-[12px]">
              Automatically adjusts sampling rate based on system activity to minimize Snapse CPU overhead.
            </span>
          </div>
          <button
            onClick={() =>
              setLocalSettings({
                ...localSettings,
                adaptive_monitoring_enabled: !localSettings.adaptive_monitoring_enabled,
              })
            }
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              localSettings.adaptive_monitoring_enabled ? 'bg-primary justify-end' : 'bg-surface-container-highest justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-surface shadow-sm"></div>
          </button>
        </div>
      </div>

      {/* 2. Alert Thresholds */}
      <div className="flex flex-col bg-surface-container-low p-space-md rounded-xl border border-surface-container-high/40 shadow-sm gap-space-sm">
        <h2 className="font-headline-sm text-body-lg text-on-surface font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400 text-[18px]">emergency</span>
          Resource Pressure Threshold Rules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-2">
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-on-surface font-medium">
              CPU Pressure Threshold ({localSettings.alert_cpu_threshold}%)
            </label>
            <span className="text-on-surface-variant text-[12px]">
              Trigger alert when overall CPU utilization sustains above this % for {localSettings.alert_cpu_duration_seconds}s.
            </span>
            <input
              type="range"
              min={50}
              max={98}
              value={localSettings.alert_cpu_threshold}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, alert_cpu_threshold: Number(e.target.value) })
              }
              className="mt-2 accent-primary cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-label-md text-on-surface font-medium">
              Memory Pressure Threshold ({localSettings.alert_memory_threshold}%)
            </label>
            <span className="text-on-surface-variant text-[12px]">
              Trigger alert when physical RAM consumption sustains above this % for {localSettings.alert_memory_duration_seconds}s.
            </span>
            <input
              type="range"
              min={60}
              max={99}
              value={localSettings.alert_memory_threshold}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, alert_memory_threshold: Number(e.target.value) })
              }
              className="mt-2 accent-tertiary cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3. Export Diagnostics & Telemetry Data */}
      <div className="flex flex-col bg-surface-container-low p-space-md rounded-xl border border-surface-container-high/40 shadow-sm gap-space-sm">
        <h2 className="font-headline-sm text-body-lg text-on-surface font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[18px]">file_download</span>
          Telemetry &amp; Process Data Export
        </h2>
        <p className="font-body-sm text-on-surface-variant">
          Export current process snapshots, historical hardware utilization samples, and diagnostics.
          All exports contain verified, non-fabricated operating-system measurements.
        </p>

        {exportStatus && (
          <div className="p-space-sm rounded bg-surface-container font-code-telemetry text-body-sm text-primary">
            {exportStatus}
          </div>
        )}

        <div className="flex items-center gap-space-sm pt-2">
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-space-xs px-space-md py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors border border-surface-container-high"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">data_object</span>
            <span>Export Snapshot (JSON)</span>
          </button>

          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-space-xs px-space-md py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors border border-surface-container-high"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">table_view</span>
            <span>Export Process Table (CSV)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
