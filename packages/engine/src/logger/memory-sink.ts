import type { LogEntry, LogSink } from './logger.ts';

/** A sink that keeps every entry in memory (tests, snapshot services). */
export interface MemorySink {
  readonly sink: LogSink;
  /** Every entry received so far, oldest first (a live view). */
  readonly entries: readonly LogEntry[];
}

/** Creates an empty memory sink. */
export function createMemorySink(): MemorySink {
  const entries: LogEntry[] = [];
  return {
    sink: (entry) => {
      entries.push(entry);
    },
    entries,
  };
}
