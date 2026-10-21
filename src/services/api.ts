import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type {
  AlertEvent,
  AppSettings,
  ProcessActionResult,
  ProcessDetails,
  ProcessHistorySample,
  ProcessSummary,
  ProcessTreeNode,
  SystemHistoryPoint,
  SystemSnapshot,
} from '../types';

export const api = {
  async getSystemSnapshot(): Promise<SystemSnapshot> {
    return await invoke<SystemSnapshot>('get_system_snapshot');
  },

  async getProcesses(): Promise<ProcessSummary[]> {
    return await invoke<ProcessSummary[]>('get_processes');
  },

  async getProcessTree(): Promise<ProcessTreeNode[]> {
    return await invoke<ProcessTreeNode[]>('get_process_tree');
  },

  async getProcessDetails(pid: number): Promise<ProcessDetails> {
    return await invoke<ProcessDetails>('get_process_details', { pid });
  },

  async terminateProcess(pid: number, startTime: number): Promise<ProcessActionResult> {
    return await invoke<ProcessActionResult>('terminate_process', { pid, startTime });
  },

  async requestProcessClose(pid: number, startTime: number): Promise<ProcessActionResult> {
    return await invoke<ProcessActionResult>('request_process_close', { pid, startTime });
  },

  async openProcessLocation(path: string): Promise<void> {
    return await invoke<void>('open_process_location', { path });
  },

  async createProcessDump(pid: number): Promise<string> {
    return await invoke<string>('create_process_dump', { pid });
  },

  async getSystemHistory(seconds: number): Promise<SystemHistoryPoint[]> {
    return await invoke<SystemHistoryPoint[]>('get_system_history', { seconds });
  },

  async getProcessHistory(pid: number, seconds: number): Promise<ProcessHistorySample[]> {
    return await invoke<ProcessHistorySample[]>('get_process_history', { pid, seconds });
  },

  async getAlerts(): Promise<AlertEvent[]> {
    return await invoke<AlertEvent[]>('get_alerts');
  },

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    return await invoke<boolean>('acknowledge_alert', { alertId });
  },

  async getSettings(): Promise<AppSettings> {
    return await invoke<AppSettings>('get_settings');
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    return await invoke<void>('save_settings', { settings });
  },

  async exportSnapshot(format: 'json' | 'csv'): Promise<string> {
    return await invoke<string>('export_snapshot', { format });
  },

  // Window chrome controls
  async minimizeWindow(): Promise<void> {
    try {
      await invoke('window_minimize');
    } catch {
      try {
        const win = getCurrentWindow();
        await win.minimize();
      } catch (e) {
        console.warn('Window minimize failed:', e);
      }
    }
  },

  async toggleMaximize(): Promise<void> {
    try {
      await invoke('window_toggle_maximize');
    } catch {
      try {
        const win = getCurrentWindow();
        await win.toggleMaximize();
      } catch (e) {
        console.warn('Window toggleMaximize failed:', e);
      }
    }
  },

  async closeWindow(): Promise<void> {
    try {
      await invoke('window_close');
    } catch {
      try {
        const win = getCurrentWindow();
        await win.close();
      } catch (e) {
        console.warn('Window close failed:', e);
      }
    }
  },

  async startDragging(): Promise<void> {
    try {
      const win = getCurrentWindow();
      await win.startDragging();
    } catch (e) {
      console.warn('Window dragging failed:', e);
    }
  },
};
