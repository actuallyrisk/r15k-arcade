import { notImplemented } from '../util/assert.ts';

/** Severity of a log entry. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** One log record handed to a sink. */
export interface LogEntry {
  readonly level: LogLevel;
  readonly scope: string;
  readonly message: string;
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
  child(scope: string): Logger;
}

/** Creates a logger; `isEnabled: false` (release builds) makes every method a no-op. */
export function createLogger(_options: {
  readonly isEnabled: boolean;
  readonly sink: LogSink;
  readonly scope?: string;
}): Logger {
  return notImplemented('engine.createLogger');
}
