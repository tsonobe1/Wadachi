import path from 'node:path';
import { app, BrowserWindow, dialog, globalShortcut, ipcMain, screen } from 'electron';
import type { Rectangle } from 'electron';
import Store from 'electron-store';
import { uIOhook, type UiohookKeyboardEvent } from 'uiohook-napi';
import { addTimestamp, formatKeystroke, type KeystrokePayload } from '../shared/keyFormatter';
import {
  defaultPreferences,
  type AppPreferences,
  type Hotkeys,
  type WindowBounds
} from '../shared/preferences';
import { safeRegisterShortcut } from './hotkeySafety';

const CHANNELS = {
  keystroke: 'overlay:keystroke',
  lockChanged: 'overlay:lock-changed',
  preferences: 'overlay:preferences'
} as const;

const store = new Store<AppPreferences>({
  name: 'preferences',
  defaults: defaultPreferences
});

let mainWindow: BrowserWindow | null = null;
let boundsDebounce: NodeJS.Timeout | null = null;
const DEFAULT_BOUNDS: Pick<WindowBounds, 'width' | 'height'> = {
  width: 640,
  height: 140
};
type HotkeyName = keyof Hotkeys;
const HOTKEY_FALLBACKS: Record<HotkeyName, string> = {
  toggleVisibility: defaultPreferences.hotkeys.toggleVisibility,
  toggleLock: defaultPreferences.hotkeys.toggleLock
};

const createMainWindow = async (): Promise<BrowserWindow> => {
  const initialBounds = resolveInitialBounds();

  mainWindow = new BrowserWindow({
    width: initialBounds.width,
    height: initialBounds.height,
    x: initialBounds.x,
    y: initialBounds.y,
    title: 'Wadachi',
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    movable: true,
    fullscreenable: false,
    focusable: !store.get('overlayLocked'),
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: process.env.NODE_ENV !== 'production'
    }
  });

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  applyLockState();

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('moved', () => scheduleBoundsSave());
  mainWindow.on('resized', () => scheduleBoundsSave());

  mainWindow.webContents.once('did-finish-load', () => {
    broadcastPreferences();
    broadcastLockState();
  });

  return mainWindow;
};

const scheduleBoundsSave = (): void => {
  if (!mainWindow) {
    return;
  }

  if (boundsDebounce) {
    clearTimeout(boundsDebounce);
  }

  boundsDebounce = setTimeout(() => {
    if (!mainWindow) {
      return;
    }

    const { x, y, width, height } = mainWindow.getBounds();
    const bounds: WindowBounds = { x, y, width, height };
    store.set('windowBounds', bounds);
  }, 200);
};

const toggleWindowVisibility = (): void => {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
  }
};

const toggleLockState = (): void => {
  const next = !store.get('overlayLocked');
  store.set('overlayLocked', next);
  applyLockState();
  broadcastLockState();
};

const applyLockState = (): void => {
  if (!mainWindow) {
    return;
  }

  const locked = store.get('overlayLocked');
  mainWindow.setIgnoreMouseEvents(locked, { forward: true });
  mainWindow.setFocusable(!locked);
};

const broadcastPreferences = (): void => {
  if (!mainWindow) {
    return;
  }

  mainWindow.webContents.send(CHANNELS.preferences, store.store);
};

const broadcastLockState = (): void => {
  if (!mainWindow) {
    return;
  }

  mainWindow.webContents.send(CHANNELS.lockChanged, store.get('overlayLocked'));
};

const registerIpcHandlers = (): void => {
  ipcMain.handle('overlay:get-preferences', () => store.store);
};

const registerShortcuts = (): void => {
  const currentHotkeys = store.get('hotkeys');
  const resolvedVisibility = ensureShortcut(
    'toggleVisibility',
    currentHotkeys.toggleVisibility,
    toggleWindowVisibility
  );
  const resolvedLock = ensureShortcut('toggleLock', currentHotkeys.toggleLock, toggleLockState);

  if (resolvedVisibility !== currentHotkeys.toggleVisibility || resolvedLock !== currentHotkeys.toggleLock) {
    store.set('hotkeys', {
      ...currentHotkeys,
      toggleVisibility: resolvedVisibility,
      toggleLock: resolvedLock
    });
    broadcastPreferences();
  }
};

const registerShortcut = (accelerator: unknown, handler: () => void): boolean =>
  safeRegisterShortcut(accelerator, handler, globalShortcut.register.bind(globalShortcut));

const startInputHook = (): void => {
  uIOhook.on('keydown', handleKeyboardEvent);
  try {
    uIOhook.start();
  } catch (error) {
    console.error('Failed to start uIOhook', error);
  }
};

const stopInputHook = (): void => {
  try {
    uIOhook.removeAllListeners('keydown');
    uIOhook.stop();
  } catch (error) {
    console.error('Failed to stop uIOhook', error);
  }
};

const handleKeyboardEvent = (event: UiohookKeyboardEvent): void => {
  const payload: KeystrokePayload = formatKeystroke(event, {
    platform: process.platform
  });
  const timed = addTimestamp(payload);
  mainWindow?.webContents.send(CHANNELS.keystroke, timed);
};

const bootstrap = async (): Promise<void> => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('dev.wadachi.app');
  }

  await app.whenReady();
  registerIpcHandlers();
  await createMainWindow();
  registerShortcuts();
  startInputHook();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
};

bootstrap().catch((error) => {
  console.error(error);
  app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopInputHook();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const resolveInitialBounds = (): Partial<WindowBounds> & Pick<WindowBounds, 'width' | 'height'> => {
  const validated = getValidatedBounds();
  if (validated) {
    return validated;
  }

  return {
    width: DEFAULT_BOUNDS.width,
    height: DEFAULT_BOUNDS.height
  };
};

const getValidatedBounds = (): WindowBounds | null => {
  const savedBounds = store.get('windowBounds');
  if (!savedBounds || !isValidBounds(savedBounds)) {
    return null;
  }

  const displays = screen.getAllDisplays();
  const intersects = displays.some((display) => rectanglesIntersect(savedBounds, display.workArea));
  return intersects ? savedBounds : null;
};

const isValidBounds = (bounds: WindowBounds): boolean =>
  [bounds.x, bounds.y, bounds.width, bounds.height].every((value) => Number.isFinite(value));

const rectanglesIntersect = (windowBounds: WindowBounds, displayArea: Rectangle): boolean => {
  const windowRight = windowBounds.x + windowBounds.width;
  const windowBottom = windowBounds.y + windowBounds.height;
  const displayRight = displayArea.x + displayArea.width;
  const displayBottom = displayArea.y + displayArea.height;

  return (
    windowBounds.x < displayRight &&
    windowRight > displayArea.x &&
    windowBounds.y < displayBottom &&
    windowBottom > displayArea.y
  );
};

const describeAccelerator = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '未設定';
  }

  return value.trim().length > 0 ? value : '未設定';
};

const ensureShortcut = (name: HotkeyName, accelerator: unknown, handler: () => void): string => {
  const normalized = typeof accelerator === 'string' ? accelerator : '';
  if (registerShortcut(normalized, handler)) {
    return normalized;
  }

  const fallback = HOTKEY_FALLBACKS[name];
  if (normalized !== fallback && registerShortcut(fallback, handler)) {
    notifyShortcutFallback(describeAccelerator(accelerator), fallback);
    return fallback;
  }

  handleShortcutFailure(describeAccelerator(accelerator));
  return normalized;
};

const notifyShortcutFallback = (original: string, fallback: string): void => {
  void dialog.showMessageBox({
    type: 'warning',
    title: 'ショートカットを初期値に戻しました',
    message: `ホットキー「${original}」を登録できなかったため、既定値「${fallback}」に戻しました。`
  });
};

const handleShortcutFailure = (accelerator: string): void => {
  dialog.showErrorBox(
    'ショートカットを登録できませんでした',
    `ホットキー「${accelerator}」を登録できませんでした。ウィンドウを操作できるようロックを解除しました。設定を見直してください。`
  );
  forceUnlockOverlay();
};

const forceUnlockOverlay = (): void => {
  if (!store.get('overlayLocked')) {
    return;
  }

  store.set('overlayLocked', false);
  applyLockState();
  broadcastLockState();
  mainWindow?.show();
  mainWindow?.focus();
};
