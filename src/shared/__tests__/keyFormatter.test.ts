import { describe, it, expect } from 'vitest';
import { formatKeystroke } from '../keyFormatter';

describe('formatKeystroke', () => {
  it('formats simple keys', () => {
    const formatted = formatKeystroke({ keycode: 30 });
    expect(formatted.label).toBe('A');
  });

  it('concatenates modifiers in order', () => {
    const formatted = formatKeystroke({
      keycode: 3,
      ctrlKey: true,
      shiftKey: true
    });

    expect(formatted.keys).toEqual(['Ctrl', 'Shift', '2']);
    expect(formatted.label).toBe('Ctrl + Shift + 2');
  });

  it('prefers Option label on macOS style platform', () => {
    const formatted = formatKeystroke(
      {
        keycode: 30,
        altKey: true
      },
      { platform: 'darwin' }
    );

    expect(formatted.keys[0]).toBe('Option');
  });
});
