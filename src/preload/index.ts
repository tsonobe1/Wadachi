import { contextBridge, ipcRenderer } from 'electron';
import type { TimedKeystroke } from '../shared/keyFormatter';
import type { AppPreferences } from '../shared/preferences';

const api = {
  getPreferences: (): Promise<AppPreferences> => ipcRenderer.invoke('overlay:get-preferences'),
  onKeystroke: (callback: (stroke: TimedKeystroke) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, stroke: TimedKeystroke) => callback(stroke);
    ipcRenderer.on('overlay:keystroke', listener);
    return () => ipcRenderer.removeListener('overlay:keystroke', listener);
  },
  onLockState: (callback: (locked: boolean) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, locked: boolean) => callback(locked);
    ipcRenderer.on('overlay:lock-changed', listener);
    return () => ipcRenderer.removeListener('overlay:lock-changed', listener);
  },
  onPreferences: (callback: (prefs: AppPreferences) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, prefs: AppPreferences) => callback(prefs);
    ipcRenderer.on('overlay:preferences', listener);
    return () => ipcRenderer.removeListener('overlay:preferences', listener);
  }
};

contextBridge.exposeInMainWorld('overlay', api);

declare global {
  interface Window {
    overlay: typeof api;
  }
}
