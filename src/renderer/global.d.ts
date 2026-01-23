import type { TimedKeystroke } from '../shared/keyFormatter';
import type { AppPreferences } from '../shared/preferences';

declare global {
  interface Window {
    overlay: {
      getPreferences: () => Promise<AppPreferences>;
      onKeystroke: (callback: (stroke: TimedKeystroke) => void) => () => void;
      onLockState: (callback: (locked: boolean) => void) => () => void;
      onPreferences: (callback: (prefs: AppPreferences) => void) => () => void;
    };
  }
}

export {};
