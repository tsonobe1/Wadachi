import { describe, expect, test, vi } from 'vitest';
import { safeRegisterShortcut } from '../hotkeySafety';

const noop = (): void => undefined;

describe('safeRegisterShortcut', () => {
  test('空文字列のショートカットは登録せずに警告する', () => {
    // 古典学派: 事実（Arrange）
    const registerFn = vi.fn();
    const logger = { warn: vi.fn() };

    // 古典学派: 演繹（Act）
    const result = safeRegisterShortcut('', noop, registerFn, logger);

    // 古典学派: 反証（Assert）
    expect(result).toBe(false);
    expect(registerFn).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  test('registerFnが例外を投げてもfalseで握りつぶす', () => {
    // 古典学派: 事実
    const registerFn = vi.fn(() => {
      throw new Error('boom');
    });
    const logger = { warn: vi.fn() };

    // 古典学派: 演繹
    const result = safeRegisterShortcut('CommandOrControl+Shift+X', noop, registerFn, logger);

    // 古典学派: 反証
    expect(result).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      'ショートカット「CommandOrControl+Shift+X」の登録処理で例外が発生しました。',
      expect.any(Error)
    );
  });

  test('registerFnがfalseを返した場合もfalseを返す', () => {
    // 古典学派: 事実
    const registerFn = vi.fn().mockReturnValue(false);
    const logger = { warn: vi.fn() };

    // 古典学派: 演繹
    const result = safeRegisterShortcut('Shift+Space', noop, registerFn, logger);

    // 古典学派: 反証
    expect(result).toBe(false);
    expect(registerFn).toHaveBeenCalledWith('Shift+Space', noop);
    expect(logger.warn).toHaveBeenCalledWith('ショートカット「Shift+Space」の登録に失敗しました。');
  });
});
