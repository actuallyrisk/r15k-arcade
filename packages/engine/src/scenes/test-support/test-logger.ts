// A logger double that keeps every entry in memory, so tests assert on log output without a console
// and without depending on the logger implementation.
import type { LogEntry, LogLevel, Logger } from '../../logger/logger.ts';

/** A logger and the entries it recorded. */
export interface TestLogger {
  readonly logger: Logger;
  readonly entries: readonly LogEntry[];
}

/** Creates a recording logger; child scopes are joined with a dot. */
export function createTestLogger(scope = 'test'): TestLogger {
  const entries: LogEntry[] = [];
  const scoped = (name: string): Logger => {
    const write = (level: LogLevel, message: string, data: unknown): void => {
      entries.push({ level, scope: name, message, data });
    };
    return {
      debug: (message, data) => {
        write('debug', message, data);
      },
      info: (message, data) => {
        write('info', message, data);
      },
      warn: (message, data) => {
        write('warn', message, data);
      },
      error: (message, error) => {
        write('error', message, error);
      },
      child: (child) => scoped(`${name}.${child}`),
    };
  };
  return { logger: scoped(scope), entries };
}
