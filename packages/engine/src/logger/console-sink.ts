import type { LogSink } from './logger.ts';

/**
 * A sink that writes to a console-like target; the only console use of the code base. Each entry goes
 * to the method of its level as `[scope] message`, followed by its data when there is any.
 */
export function createConsoleSink(
  target: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>,
): LogSink {
  return (entry) => {
    const text = entry.scope === '' ? entry.message : `[${entry.scope}] ${entry.message}`;
    const parts: readonly unknown[] = entry.data === undefined ? [text] : [text, entry.data];
    target[entry.level](...parts);
  };
}
