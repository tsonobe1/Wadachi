type ShortcutHandler = () => void;

type RegisterFunction = (accelerator: string, handler: ShortcutHandler) => boolean;

type ShortcutLogger = Pick<Console, 'warn'>;

const isUsableAccelerator = (accelerator: unknown): accelerator is string =>
  typeof accelerator === 'string' && accelerator.trim().length > 0;

export const safeRegisterShortcut = (
  accelerator: unknown,
  handler: ShortcutHandler,
  registerFn: RegisterFunction,
  logger: ShortcutLogger = console
): boolean => {
  if (!isUsableAccelerator(accelerator)) {
    logger.warn('ホットキーが未設定か、空文字のため登録をスキップしました。');
    return false;
  }

  try {
    const registered = registerFn(accelerator, handler);
    if (!registered) {
      logger.warn(`ショートカット「${accelerator}」の登録に失敗しました。`);
    }
    return registered;
  } catch (error) {
    logger.warn(`ショートカット「${accelerator}」の登録処理で例外が発生しました。`, error);
    return false;
  }
};
