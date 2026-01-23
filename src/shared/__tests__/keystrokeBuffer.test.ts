import { describe, it, expect, vi } from 'vitest';
import { KeystrokeBuffer } from '../keystrokeBuffer';
import { addTimestamp, formatKeystroke } from '../keyFormatter';

describe('KeystrokeBuffer', () => {
  it('keeps recent entries and purges expired ones', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const buffer = new KeystrokeBuffer(500);
    const a = addTimestamp(formatKeystroke({ keycode: 30 }), 0);
    const b = addTimestamp(formatKeystroke({ keycode: 48 }), 300);

    buffer.push(a);
    buffer.push(b);

    const snapshot = buffer.snapshot(600);

    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].label).toBe('B');
    vi.useRealTimers();
  });
});
