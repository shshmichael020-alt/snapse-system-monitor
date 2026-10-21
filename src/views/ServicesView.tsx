import React, { useState } from 'react';
import type { ProcessSummary } from '../types';

interface ServicesViewProps {
  processes: ProcessSummary[];
}

interface WindowsService {
  name: string;
  displayName: string;
  pid?: number;
  status: 'Running' | 'Stopped';
  startupType: 'Automatic' | 'Manual' | 'Disabled';
  group: string;
}

export const ServicesView: React.FC<ServicesViewProps> = ({ processes }) => {
  const [filterQuery, setFilterQuery] = useState('');

  // Map known processes to service entries
  const pidMap = new Map(processes.map((p) => [p.name.toLowerCase(), p.pid]));

  const initialServices: WindowsService[] = [
    {
      name: 'wuauserv',
      displayName: 'Windows Update',
      pid: pidMap.get('svchost.exe'),
      status: 'Running',
      startupType: 'Manual',
      group: 'netsvcs',
    },
    {
      name: 'WinDefend',
      displayName: 'Microsoft Defender Antivirus Service',
      pid: pidMap.get('msmpeng.exe'),
      status: 'Running',
      startupType: 'Automatic',
      group: 'Security',
    },
    {
      name: 'Spooler',
      displayName: 'Print Spooler',
      pid: pidMap.get('spoolsv.exe'),
      status: 'Running',
      startupType: 'Automatic',
      group: 'SpoolerGroup',
    },
    {
      name: 'W32Time',
      displayName: 'Windows Time',
      status: 'Running',
      startupType: 'Manual',
      group: 'Special',
    },
    {
      name: 'EventLog',
      displayName: 'Windows Event Log',
      pid: pidMap.get('svchost.exe'),
      status: 'Running',
      startupType: 'Automatic',
      group: 'LocalService',
    },
    {
      name: 'Dhcp',
      displayName: 'DHCP Client',
      pid: pidMap.get('svchost.exe'),
      status: 'Running',
      startupType: 'Automatic',
      group: 'TDI',
    },
    {
      name: 'Dnscache',
      displayName: 'DNS Client',
      pid: pidMap.get('svchost.exe'),
      status: 'Running',
      startupType: 'Automatic',
      group: 'TDI',
    },
    {
      name: 'SysMain',
      displayName: 'SysMain (Superfetch)',
      pid: pidMap.get('svchost.exe'),
      status: 'Running',
      startupType: 'Automatic',
      group: 'LocalSystemNetworkRestricted',
    },
    {
      name: 'BTAGService',
      displayName: 'Bluetooth Audio Gateway Service',
      status: 'Stopped',
      startupType: 'Manual',
      group: 'BthGroup',
    },
    {
      name: 'DiagTrack',
      displayName: 'Connected User Experiences and Telemetry',
      pid: pidMap.get('svchost.exe'),
      status: 'Running',
      startupType: 'Automatic',
      group: 'Utcsvc',
    },
  ];

  const filtered = initialServices.filter(
    (s) =>
      s.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.displayName.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (s.pid && s.pid.toString().includes(filterQuery))
  );

  return (
    <div className="flex flex-col w-full text-on-surface select-none gap-space-md">
      {/* Top Banner */}
      <div className="flex items-center justify-between p-space-md bg-surface-container-low rounded-xl border border-surface-container-high/40 shadow-sm flex-wrap gap-2">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary text-[24px]">
            settings_ethernet
          </span>
          <div className="flex flex-col">
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Windows System Services
            </h1>
            <span className="font-code-telemetry text-body-sm text-on-surface-variant">
              Win32 Service Control Manager telemetry
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          <div className="flex items-center bg-surface-container px-space-md py-1 rounded gap-space-sm border border-surface-container-high/40">
            <span className="material-symbols-outlined text-outline text-[16px]">filter_alt</span>
            <input
              className="bg-transparent border-none text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none w-48"
              placeholder="Search services..."
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>
          <span className="px-space-sm py-0.5 rounded bg-surface-container-high text-primary font-code-telemetry text-label-sm font-semibold">
            {filtered.length} Monitored
          </span>
        </div>
      </div>

      {/* SCM Elevation Notice */}
      <div className="p-3 bg-surface-container rounded-lg border border-surface-container-high/40 text-on-surface-variant font-body-sm text-[12px] flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
        <span>
          Win32 Service Control Manager (SCM) telemetry maps core system services to their executing host container PIDs (<code className="text-on-surface">svchost.exe</code>, <code className="text-on-surface">spoolsv.exe</code>). Direct start/stop controls require elevated Service Control Administrator rights.
        </span>
      </div>

      {/* Services Table */}
      <div className="flex flex-col bg-surface-container-low rounded-xl overflow-hidden border border-surface-container-high/40 shadow-sm">
        <div className="grid grid-cols-12 bg-surface-container px-space-md py-space-xs text-on-surface-variant font-code-telemetry text-[11px] uppercase tracking-wider items-center border-b border-surface-container-high">
          <div className="col-span-3">Name</div>
          <div className="col-span-1 text-right pr-2">PID</div>
          <div className="col-span-4">Display Name</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Startup Type</div>
        </div>

        <div className="divide-y divide-surface-container-high/30 max-h-[64vh] overflow-y-auto">
          {filtered.map((s, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 px-space-md py-2 items-center font-body-sm text-body-sm hover:bg-surface-container/40 transition-colors"
            >
              <div className="col-span-3 font-code-telemetry font-medium text-on-surface truncate">
                {s.name}
              </div>

              <div className="col-span-1 text-right pr-2 font-code-telemetry text-outline tabular-nums">
                {s.pid ?? '-'}
              </div>

              <div className="col-span-4 text-on-surface-variant truncate pr-2">
                {s.displayName}
              </div>

              <div className="col-span-2 font-code-telemetry text-[11px]">
                <span
                  className={`px-1.5 py-0.2 rounded ${
                    s.status === 'Running'
                      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      : 'bg-surface-container text-outline'
                  }`}
                >
                  {s.status}
                </span>
              </div>

              <div className="col-span-2 font-code-telemetry text-[11px] text-outline">
                {s.startupType}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
