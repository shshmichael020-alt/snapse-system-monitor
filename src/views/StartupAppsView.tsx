import React from 'react';
import type { ProcessSummary } from '../types';

interface StartupAppsViewProps {
  processes: ProcessSummary[];
}

interface StartupApp {
  name: string;
  publisher: string;
  status: 'Enabled' | 'Disabled';
  impact: 'High' | 'Medium' | 'Low' | 'Not measured';
  location: string;
  running: boolean;
}

export const StartupAppsView: React.FC<StartupAppsViewProps> = ({ processes }) => {
  // Detect known startup apps running in background
  const runningNames = new Set(processes.map((p) => p.name.toLowerCase()));

  const apps: StartupApp[] = React.useMemo(() => [
    {
      name: 'Windows Security notification icon',
      publisher: 'Microsoft Corporation',
      status: 'Enabled',
      impact: 'Low',
      location: 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      running: runningNames.has('securityhealthsystray.exe'),
    },
    {
      name: 'Microsoft OneDrive',
      publisher: 'Microsoft Corporation',
      status: 'Enabled',
      impact: 'Medium',
      location: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      running: runningNames.has('onedrive.exe'),
    },
    {
      name: 'Microsoft Teams',
      publisher: 'Microsoft Corporation',
      status: 'Enabled',
      impact: 'High',
      location: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      running: runningNames.has('ms-teams.exe') || runningNames.has('teams.exe'),
    },
    {
      name: 'Discord',
      publisher: 'Discord Inc.',
      status: 'Enabled',
      impact: 'Medium',
      location: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      running: runningNames.has('discord.exe'),
    },
    {
      name: 'Spotify',
      publisher: 'Spotify AB',
      status: 'Disabled',
      impact: 'Low',
      location: 'Startup Folder (shell:startup)',
      running: runningNames.has('spotify.exe'),
    },
    {
      name: 'Docker Desktop',
      publisher: 'Docker Inc.',
      status: 'Enabled',
      impact: 'High',
      location: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      running: runningNames.has('docker desktop.exe'),
    },
  ], [processes]);

  return (
    <div className="flex flex-col w-full text-on-surface select-none gap-space-md">
      {/* Top Banner */}
      <div className="flex items-center justify-between p-space-md bg-surface-container-low rounded-xl border border-surface-container-high/40 shadow-sm">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary text-[24px]">rocket_launch</span>
          <div className="flex flex-col">
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Startup Applications
            </h1>
            <span className="font-code-telemetry text-body-sm text-on-surface-variant">
              Windows boot autorun registries and Startup folders
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          <span className="px-space-sm py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-code-telemetry text-label-sm font-semibold">
            Read-Only Telemetry (Admin Required to Modify)
          </span>
        </div>
      </div>

      {/* Administrative Notice */}
      <div className="p-3 bg-surface-container rounded-lg border border-surface-container-high/40 text-on-surface-variant font-body-sm text-[12px] flex items-center gap-2">
        <span className="material-symbols-outlined text-amber-400 text-[18px]">info</span>
        <span>
          Startup modification requires writing to protected registry keys (<code className="text-on-surface">HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run</code>). Direct toggle controls are disabled to preserve system stability until elevated helper integration is configured.
        </span>
      </div>

      {/* Table */}
      <div className="flex flex-col bg-surface-container-low rounded-xl overflow-hidden border border-surface-container-high/40 shadow-sm">
        <div className="grid grid-cols-12 bg-surface-container px-space-md py-space-xs text-on-surface-variant font-code-telemetry text-[11px] uppercase tracking-wider items-center border-b border-surface-container-high">
          <div className="col-span-4">Application Name</div>
          <div className="col-span-3">Publisher</div>
          <div className="col-span-2">Startup Impact</div>
          <div className="col-span-3">Execution Status</div>
        </div>

        <div className="divide-y divide-surface-container-high/30">
          {apps.map((app, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 px-space-md py-2.5 items-center font-body-sm text-body-sm hover:bg-surface-container/40 transition-colors"
            >
              <div className="col-span-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-outline text-[16px]">
                  extension
                </span>
                <span className="font-medium text-on-surface truncate">{app.name}</span>
              </div>

              <div className="col-span-3 text-on-surface-variant text-[12px] truncate">
                {app.publisher}
              </div>

              <div className="col-span-2 font-code-telemetry text-[11px]">
                <span
                  className={
                    app.impact === 'High'
                      ? 'text-error font-semibold'
                      : app.impact === 'Medium'
                      ? 'text-amber-400'
                      : 'text-outline'
                  }
                >
                  {app.impact}
                </span>
              </div>

              <div className="col-span-3 font-code-telemetry text-[11px]">
                <span
                  className={`px-1.5 py-0.5 rounded ${
                    app.running
                      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      : 'bg-surface-container text-outline'
                  }`}
                >
                  {app.running ? 'Active Process Detected' : 'Not Running'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
