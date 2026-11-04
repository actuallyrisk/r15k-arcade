import { notImplemented } from '../util/assert.ts';
import type { LogEntry, LogSink } from './logger.ts';

/** A sink that keeps every entry in memory (tests, snapshot services). */
export interface MemorySink {
  readonly sink: LogSink;
  readonly entries: readonly LogEntry[];
}

/** Creates an empty memory sink. */
export function createMemorySink(): MemorySink {
  return notImplemented('engine.createMemorySink');
}
