import path from 'node:path';
import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain
} from 'electron';
import Store from 'electron-store';
import {
  uIOhook,
  type UiohookKeyboardEvent
} from 'uiohook-napi';
import {
  addTimestamp,
  formatKeystroke,
  type KeystrokePayload
} from '../shared/keyFormatter';
import {
  defaultPreferences,
  type AppPreferences,
  type WindowBounds
} from '../shared/preferences';

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

const createMainWindow = async (): Promise<BrowserWindow> => {
  const savedBounds = store.get('windowBounds');

  mainWindow = new BrowserWindow({
    width: savedBounds?.width ?? 640,
    height: savedBounds?.height ?? 140,
    x: savedBounds?.x,
    y: savedBounds?.y,
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
  const { toggleVisibility, toggleLock } = store.get('hotkeys');
  registerShortcut(toggleVisibility, toggleWindowVisibility);
  registerShortcut(toggleLock, toggleLockState);
};

const registerShortcut = (accelerator: string, handler: () => void): void => {
  const registered = globalShortcut.register(accelerator, handler);
  if (!registered) {
    console.warn(`Failed to register shortcut: ${accelerator}`);
  }
};

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
