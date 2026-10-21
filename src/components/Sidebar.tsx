import React from 'react';

export type TabId =
  | 'overview'
  | 'processes'
  | 'performance'
  | 'process-tree'
  | 'startup-apps'
  | 'services'
  | 'history-and-alerts'
  | 'resource-3d'
  | 'compact-mode'
  | 'settings';

interface SidebarProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  alertCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, alertCount }) => {
  const primaryNavItems: { id: TabId; label: string; icon: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'processes', label: 'Processes', icon: 'list' },
    { id: 'performance', label: 'Performance', icon: 'monitoring' },
    { id: 'process-tree', label: 'Process Tree', icon: 'account_tree' },
    { id: 'startup-apps', label: 'Startup Apps', icon: 'rocket_launch' },
    { id: 'services', label: 'Services', icon: 'settings_ethernet' },
    { id: 'history-and-alerts', label: 'History & Alerts', icon: 'notifications', badge: alertCount },
    { id: 'resource-3d', label: 'Resource 3D', icon: 'view_in_ar' },
  ];

  const secondaryNavItems: { id: TabId; label: string; icon: string }[] = [
    { id: 'compact-mode', label: 'Compact Mode', icon: 'picture_in_picture_alt' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <aside className="fixed left-0 top-9 bottom-7 w-52 bg-surface-container-lowest z-40 flex flex-col justify-between py-space-sm border-r border-surface-container-high/30 select-none">
      <nav className="flex flex-col gap-space-xs px-space-xs">
        {primaryNavItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center justify-between px-space-md py-space-xs rounded transition-colors text-left ${
                isActive
                  ? 'bg-surface-container-high text-primary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-space-sm">
                <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-primary' : ''}`}>
                  {item.icon}
                </span>
                <span className="font-label-md text-label-md">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-error-container text-error text-[10px] font-code-telemetry font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-space-xs px-space-xs">
        {secondaryNavItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-space-sm px-space-md py-space-xs rounded transition-colors text-left ${
                isActive
                  ? 'bg-surface-container-high text-primary font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-primary' : ''}`}>
                {item.icon}
              </span>
              <span className="font-label-md text-label-md">{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
