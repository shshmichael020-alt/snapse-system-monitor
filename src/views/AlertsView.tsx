import React from 'react';
import { api } from '../services/api';
import type { AlertEvent } from '../types';

interface AlertsViewProps {
  alerts: AlertEvent[];
  onRefresh: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts, onRefresh }) => {
  const handleAcknowledge = async (id: string) => {
    await api.acknowledgeAlert(id);
    onRefresh();
  };

  const formatTime = (ts: number): string => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const activeAlerts = alerts.filter((a) => !a.acknowledged);
  const historyAlerts = alerts.filter((a) => a.acknowledged);

  return (
    <div className="flex flex-col w-full text-on-surface select-none gap-space-md">
      {/* Top Banner */}
      <div className="flex items-center justify-between p-space-md bg-surface-container-low rounded-xl border border-surface-container-high/40 shadow-sm">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary text-[24px]">notifications</span>
          <div className="flex flex-col">
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              System Alerts &amp; Resource Pressure Diagnostics
            </h1>
            <span className="font-code-telemetry text-body-sm text-on-surface-variant">
              Rule-based sustained threshold evaluations (non-fabricated telemetry)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          <span className="px-space-sm py-0.5 rounded bg-surface-container-high text-primary font-code-telemetry text-label-sm font-semibold">
            {activeAlerts.length} Active • {historyAlerts.length} Resolved
          </span>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 bg-surface-container hover:bg-surface-container-high px-space-md py-1 rounded text-on-surface font-label-md text-label-md transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Active Alerts Section */}
      <div className="flex flex-col gap-space-sm">
        <h2 className="font-headline-sm text-body-lg text-on-surface font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-[18px]">emergency</span>
          Active Sustained Alerts ({activeAlerts.length})
        </h2>

        {activeAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-surface-container-low rounded-xl border border-surface-container-high/40 text-center gap-2">
            <span className="material-symbols-outlined text-teal-400 text-[36px]">verified</span>
            <span className="font-label-md text-on-surface font-semibold">System Nominal</span>
            <p className="font-body-sm text-on-surface-variant max-w-md">
              No sustained CPU or memory resource pressure detected. Alerts fire when usage remains above
              configured thresholds for several seconds.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-space-xs">
            {activeAlerts.map((a) => (
              <div
                key={a.id}
                className={`flex items-center justify-between p-space-md rounded-xl border transition-all ${
                  a.severity === 'Critical'
                    ? 'bg-error-container/20 border-error/50 text-on-surface'
                    : 'bg-amber-500/10 border-amber-500/40 text-on-surface'
                }`}
              >
                <div className="flex items-center gap-space-md">
                  <span
                    className={`material-symbols-outlined text-[24px] ${
                      a.severity === 'Critical' ? 'text-error' : 'text-amber-400'
                    }`}
                  >
                    {a.severity === 'Critical' ? 'report' : 'warning'}
                  </span>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-on-surface">{a.message}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-code-telemetry text-[10px] uppercase font-bold ${
                          a.severity === 'Critical'
                            ? 'bg-error-container text-error'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {a.severity}
                      </span>
                    </div>
                    <span className="font-code-telemetry text-[11px] text-on-surface-variant mt-0.5">
                      Triggered at {formatTime(a.timestamp_ms)} • Metric: {a.metric} (Value: {a.value.toFixed(1)}%, Threshold: {a.threshold.toFixed(1)}%, Duration: {a.duration_seconds}s)
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleAcknowledge(a.id)}
                  className="flex items-center gap-1 bg-surface-container hover:bg-surface-container-high px-space-md py-1 rounded text-on-surface font-label-md text-label-md transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>Acknowledge</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert History Section */}
      {historyAlerts.length > 0 && (
        <div className="flex flex-col gap-space-sm pt-space-md border-t border-surface-container-high/40">
          <h2 className="font-headline-sm text-body-lg text-on-surface-variant font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-outline text-[18px]">history</span>
            Acknowledged / Historical Alerts ({historyAlerts.length})
          </h2>

          <div className="flex flex-col divide-y divide-surface-container-high/30 bg-surface-container-low rounded-xl border border-surface-container-high/40 overflow-hidden">
            {historyAlerts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-space-sm px-space-md font-code-telemetry text-body-sm opacity-60 hover:opacity-100 transition-opacity"
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-outline text-[16px]">done</span>
                  <span>{a.message}</span>
                </div>
                <span className="text-outline text-[11px]">{formatTime(a.timestamp_ms)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
