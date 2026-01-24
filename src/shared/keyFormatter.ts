export interface KeyEventLike {
  keycode: number;
  rawcode?: number;
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

export interface KeystrokePayload {
  keys: string[];
  label: string;
  keycode: number;
}

export type TimedKeystroke = KeystrokePayload & { timestamp: number };

export interface FormatOptions {
  platform?: NodeJS.Platform | 'browser';
}

const KEYCODE_MAP: Record<number, string> = {
  // Letters
  30: 'A',
  48: 'B',
  46: 'C',
  32: 'D',
  18: 'E',
  33: 'F',
  34: 'G',
  35: 'H',
  23: 'I',
  36: 'J',
  37: 'K',
  38: 'L',
  50: 'M',
  49: 'N',
  24: 'O',
  25: 'P',
  16: 'Q',
  19: 'R',
  31: 'S',
  20: 'T',
  22: 'U',
  47: 'V',
  17: 'W',
  45: 'X',
  21: 'Y',
  44: 'Z',
  // Digits
  2: '1',
  3: '2',
  4: '3',
  5: '4',
  6: '5',
  7: '6',
  8: '7',
  9: '8',
  10: '9',
  11: '0',
  // Controls & whitespace
  28: 'Enter',
  1: 'Esc',
  14: 'Backspace',
  15: 'Tab',
  57: 'Space',
  58: 'Caps Lock',
  // Symbols
  12: '-',
  13: '=',
  26: '[',
  27: ']',
  43: '\\',
  39: ';',
  40: "'",
  41: '`',
  51: ',',
  52: '.',
  53: '/',
  // Function row
  59: 'F1',
  60: 'F2',
  61: 'F3',
  62: 'F4',
  63: 'F5',
  64: 'F6',
  65: 'F7',
  66: 'F8',
  67: 'F9',
  68: 'F10',
  87: 'F11',
  88: 'F12',
  91: 'F13',
  92: 'F14',
  93: 'F15',
  99: 'F16',
  100: 'F17',
  101: 'F18',
  102: 'F19',
  103: 'F20',
  104: 'F21',
  105: 'F22',
  106: 'F23',
  107: 'F24',
  // Navigation / editing
  3657: 'Page Up',
  3665: 'Page Down',
  3663: 'End',
  3655: 'Home',
  57419: '←',
  57416: '↑',
  57421: '→',
  57424: '↓',
  3666: 'Insert',
  3667: 'Delete',
  // Numpad
  69: 'Num Lock',
  3637: 'Numpad /',
  55: 'Numpad *',
  74: 'Numpad -',
  78: 'Numpad +',
  3612: 'Numpad Enter',
  79: 'Numpad 1',
  80: 'Numpad 2',
  81: 'Numpad 3',
  75: 'Numpad 4',
  76: 'Numpad 5',
  77: 'Numpad 6',
  71: 'Numpad 7',
  72: 'Numpad 8',
  73: 'Numpad 9',
  82: 'Numpad 0',
  83: 'Numpad .',
  61007: 'Numpad End',
  61008: 'Numpad Down',
  61009: 'Numpad Page Down',
  61003: 'Numpad Left',
  61005: 'Numpad Right',
  60999: 'Numpad Home',
  61000: 'Numpad Up',
  61001: 'Numpad Page Up',
  61010: 'Numpad Insert',
  61011: 'Numpad Delete',
  // Lock / print keys
  70: 'Scroll Lock',
  3639: 'Print Screen',
  // Modifiers (fallback labels if modifier state missing)
  29: 'Ctrl',
  3613: 'Ctrl',
  56: 'Alt',
  3640: 'Alt',
  42: 'Shift',
  54: 'Shift',
  3675: 'Meta',
  3676: 'Meta'
};

const MODIFIER_KEYCODES: Partial<Record<number, keyof KeyEventLike>> = {
  29: 'ctrlKey',
  3613: 'ctrlKey',
  56: 'altKey',
  3640: 'altKey',
  42: 'shiftKey',
  54: 'shiftKey',
  3675: 'metaKey',
  3676: 'metaKey'
};

const MODIFIERS: Array<{ key: keyof KeyEventLike; label(platform: NodeJS.Platform | 'browser'): string }> = [
  {
    key: 'ctrlKey',
    label: () => 'Ctrl'
  },
  {
    key: 'altKey',
    label: (platform) => (platform === 'darwin' ? 'Option' : 'Alt')
  },
  {
    key: 'shiftKey',
    label: () => 'Shift'
  },
  {
    key: 'metaKey',
    label: (platform) => (platform === 'darwin' ? 'Cmd' : 'Win')
  }
];

const KEY_DELIMITER = ' + ';

const normalizePlatform = (platform?: NodeJS.Platform | 'browser'): NodeJS.Platform | 'browser' => {
  if (platform) {
    return platform;
  }

  if (typeof process !== 'undefined' && process.platform) {
    return process.platform;
  }

  return 'browser';
};

export const formatKeystroke = (event: KeyEventLike, options?: FormatOptions): KeystrokePayload => {
  const platform = normalizePlatform(options?.platform);
  const keys: string[] = [];

  MODIFIERS.forEach((modifier) => {
    if (event[modifier.key]) {
      keys.push(modifier.label(platform));
    }
  });

  const primary = KEYCODE_MAP[event.keycode] ?? `Key ${event.keycode}`;
  if (!isDuplicateModifier(event.keycode, event, primary, keys)) {
    keys.push(primary);
  }

  return {
    keys,
    label: keys.join(KEY_DELIMITER),
    keycode: event.keycode
  };
};

const isDuplicateModifier = (
  keycode: number,
  event: KeyEventLike,
  primary: string,
  keys: string[]
): boolean => {
  const modifierKey = MODIFIER_KEYCODES[keycode];

  if (modifierKey) {
    return Boolean(event[modifierKey]);
  }

  if (!primary) {
    return false;
  }

  return keys.includes(primary);
};

export const addTimestamp = (payload: KeystrokePayload, timestamp = Date.now()): TimedKeystroke => ({
  ...payload,
  timestamp
});
