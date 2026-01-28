export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppearanceSettings {
  accentColor: string;
  backgroundOpacity: number;
  fontSizePx: number;
}

export interface Hotkeys {
  toggleVisibility: string;
  toggleLock: string;
}

export interface AppPreferences {
  overlayLocked: boolean;
  windowBounds: WindowBounds | null;
  appearance: AppearanceSettings;
  hotkeys: Hotkeys;
}

export const defaultPreferences: AppPreferences = {
  overlayLocked: true,
  windowBounds: null,
  appearance: {
    accentColor: '#3b82f6',
    backgroundOpacity: 0.18,
    fontSizePx: 28
  },
  hotkeys: {
    toggleVisibility: 'CommandOrControl+Shift+K',
    toggleLock: 'CommandOrControl+Shift+L'
  }
};
