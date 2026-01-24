import { describe, it, expect } from 'vitest';
import { formatKeystroke } from '../keyFormatter';

describe('formatKeystroke', () => {
  it('単純なキーをフォーマットする', () => {
    const formatted = formatKeystroke({ keycode: 30 });
    expect(formatted.label).toBe('A');
  });

  it('修飾キーを順序通りに連結する', () => {
    const formatted = formatKeystroke({
      keycode: 3,
      ctrlKey: true,
      shiftKey: true
    });

    expect(formatted.keys).toEqual(['Ctrl', 'Shift', '2']);
    expect(formatted.label).toBe('Ctrl + Shift + 2');
  });

  it('macOSプラットフォームではOptionラベルを優先する', () => {
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
