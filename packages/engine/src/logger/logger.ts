/** Severity of a log entry. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** One log record handed to a sink. */
export interface LogEntry {
  readonly level: LogLevel;
  /** Dot-separated scope path ('' for the root logger). */
  readonly scope: string;
  readonly message: string;
  /** Extra data, or the error for `error` entries; `undefined` when none was passed. */
  readonly data: unknown;
}

/** Receives log entries (console in dev builds, memory in tests). */
export type LogSink = (entry: LogEntry) => void;

/** Scoped logger; every method is a no-op in release builds. */
export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: unknown): void;
  /** A logger whose scope is this scope plus `.scope` (just `scope` below the root). */
  child(scope: string): Logger;
}

/** The logger of release builds: drops everything, including its children's entries. */
const DISABLED_LOGGER: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  child: () => DISABLED_LOGGER,
};

/** An enabled logger for one scope. */
function createScopedLogger(sink: LogSink, scope: string): Logger {
  const write = (level: LogLevel, message: string, data: unknown): void => {
    sink({ level, scope, message, data });
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
    child: (childScope) =>
      createScopedLogger(sink, scope === '' ? childScope : `${scope}.${childScope}`),
  };
}

/**
 * Creates a logger; `isEnabled: false` (release builds) makes every method a no-op. Errors thrown by
 * the sink reach the caller.
 */
export function createLogger(options: {
  readonly isEnabled: boolean;
  readonly sink: LogSink;
  readonly scope?: string;
}): Logger {
  return options.isEnabled
    ? createScopedLogger(options.sink, options.scope ?? '')
    : DISABLED_LOGGER;
}
