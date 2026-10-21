import React from 'react';
import { api } from '../services/api';
import type { SystemSnapshot } from '../types';

interface TitleBarProps {
  snapshot: SystemSnapshot | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchRef?: React.RefObject<HTMLInputElement>;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  snapshot,
  searchQuery,
  onSearchChange,
  searchRef,
}) => {
  const isAdmin = snapshot ? snapshot.system.is_admin : true;

  return (
    <header
      data-tauri-drag-region
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('button, input, kbd, select')) return;
        api.startDragging();
      }}
      className="fixed top-0 left-0 right-0 z-50 h-9 bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-between px-margin-dense border-b border-surface-container-high/40 select-none"
    >
      {/* Brand & App Title */}
      <div className="flex items-center gap-space-sm pointer-events-none">
        <div className="w-5 h-5 rounded bg-primary-container/20 border border-primary-container/40 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary-container text-[14px]">speed</span>
        </div>
        <span className="font-label-md text-label-md text-on-surface tracking-tight font-semibold">
          Snapse — Task Manager {isAdmin ? '(Administrator)' : ''}
        </span>
      </div>

      {/* Central Global Search and Live Telemetry Pill */}
      <div className="flex items-center gap-space-md">
        <div className="flex items-center bg-surface-container-low px-space-md py-space-xs rounded gap-space-sm border border-surface-container-high/30 focus-within:border-primary-container transition-colors">
          <span className="material-symbols-outlined text-outline text-[16px]">search</span>
          <input
            ref={searchRef}
            className="bg-transparent border-none text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none w-64"
            placeholder="Search processes, PIDs, services... Ctrl+K"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <kbd className="font-code-telemetry text-code-telemetry text-on-surface-variant bg-surface-container px-space-xs rounded">
            Ctrl+K
          </kbd>
        </div>

        <div className="hidden md:flex items-center gap-space-xs bg-surface-container-high px-space-sm py-space-xs rounded">
          <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
          <span className="font-code-telemetry text-code-telemetry text-on-surface-variant">
            Telemetry: 1.0s • Rust Engine Active
          </span>
        </div>
      </div>

      {/* User Avatar & Window Caption Controls */}
      <div className="flex items-center gap-space-xs" data-tauri-drag-region="false">
        <div
          data-tauri-drag-region="false"
          className="w-7 h-7 rounded-full bg-primary flex items-center justify-center cursor-pointer shadow-sm"
          title="Active Session Profile"
        >
          <span className="material-symbols-outlined text-on-primary text-[16px]">person</span>
        </div>

        <div className="flex items-center" data-tauri-drag-region="false">
          <button
            data-tauri-drag-region="false"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              api.minimizeWindow();
            }}
            className="w-11 h-9 flex items-center justify-center hover:bg-surface-container-high hover:text-on-surface text-on-surface-variant transition-colors cursor-pointer"
            title="Minimize"
          >
            <span className="material-symbols-outlined text-[16px] pointer-events-none">minimize</span>
          </button>
          <button
            data-tauri-drag-region="false"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              api.toggleMaximize();
            }}
            className="w-11 h-9 flex items-center justify-center hover:bg-surface-container-high hover:text-on-surface text-on-surface-variant transition-colors cursor-pointer"
            title="Maximize"
          >
            <span className="material-symbols-outlined text-[14px] pointer-events-none">crop_square</span>
          </button>
          <button
            data-tauri-drag-region="false"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              api.closeWindow();
            }}
            className="w-11 h-9 flex items-center justify-center hover:bg-error-container hover:text-on-error-container text-on-surface-variant transition-colors cursor-pointer"
            title="Close"
          >
            <span className="material-symbols-outlined text-[16px] pointer-events-none">close</span>
          </button>
        </div>
      </div>
    </header>
  );
};
