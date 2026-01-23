import './style.css';
import { KeystrokeBuffer } from '../shared/keystrokeBuffer';
import type { TimedKeystroke } from '../shared/keyFormatter';
import type { AppPreferences } from '../shared/preferences';

const buffer = new KeystrokeBuffer(1800);
const appRoot = document.getElementById('app');

if (!appRoot) {
  throw new Error('#app container not found');
}

appRoot.innerHTML = `
  <div id="overlay" class="overlay is-locked">
    <div class="overlay__status">
      <span class="overlay__title">Wadachi</span>
      <span id="lock-indicator" class="overlay__lock">Locked</span>
    </div>
    <div id="keystrokes" class="overlay__keystrokes"></div>
    <div id="hotkey-hint" class="overlay__hint"></div>
  </div>
`;

const overlayEl = document.getElementById('overlay') as HTMLDivElement;
const keystrokesEl = document.getElementById('keystrokes') as HTMLDivElement;
const lockIndicatorEl = document.getElementById('lock-indicator') as HTMLSpanElement;
const hotkeyHintEl = document.getElementById('hotkey-hint') as HTMLDivElement;

const renderKeystrokes = (): void => {
  const strokes = buffer.snapshot();
  keystrokesEl.innerHTML = '';

  strokes.forEach((stroke) => {
    const item = document.createElement('div');
    item.className = 'keystroke';
    item.textContent = stroke.label;
    keystrokesEl.appendChild(item);
  });
};

const setLocked = (locked: boolean): void => {
  overlayEl.classList.toggle('is-locked', locked);
  overlayEl.classList.toggle('is-unlocked', !locked);
  lockIndicatorEl.textContent = locked ? 'Locked (passthrough)' : 'Unlocked (draggable)';
};

const applyPreferences = (prefs: AppPreferences): void => {
  document.documentElement.style.setProperty('--accent-color', prefs.appearance.accentColor);
  document.documentElement.style.setProperty('--overlay-font-size', `${prefs.appearance.fontSizePx}px`);
  document.documentElement.style.setProperty('--overlay-bg-opacity', prefs.appearance.backgroundOpacity.toString());
  hotkeyHintEl.textContent = `Show/Hide: ${prefs.hotkeys.toggleVisibility} | Lock: ${prefs.hotkeys.toggleLock}`;
};

const handleKeystroke = (stroke: TimedKeystroke): void => {
  buffer.push(stroke);
  renderKeystrokes();
};

window.overlay.onKeystroke(handleKeystroke);
window.overlay.onLockState(setLocked);
window.overlay.onPreferences(applyPreferences);
window.overlay
  .getPreferences()
  .then(applyPreferences)
  .catch((error) => console.error('Failed to load preferences', error));

setInterval(renderKeystrokes, 200);
