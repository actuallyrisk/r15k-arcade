import type { Logger } from '../logger/logger.ts';
import { notImplemented } from '../util/assert.ts';
import type { LoadOutcome, SaveSchema } from './save-schema.ts';
import type { StorageAdapter } from './storage-adapter.ts';

/** Construction options of a save store. */
export interface SaveStoreOptions<T> {
  readonly adapter: StorageAdapter;
  readonly schema: SaveSchema<T>;
  /** 'save'. */
  readonly key: string;
  readonly logger: Logger;
  /** Debounce, default 250. */
  readonly writeDelayMs?: number;
}

/** One versioned save document with migrations, validation, debounced writes and backups. */
export class SaveStore<T> {
  constructor(_options: SaveStoreOptions<T>) {
    return notImplemented('engine.SaveStore.constructor');
  }

  /** Loads the stored document; called at most once. */
  load(): Promise<LoadOutcome> {
    return notImplemented('engine.SaveStore.load');
  }

  /** The in-memory document (before load() resolved: schema.createDefault()). */
  get(): T {
    return notImplemented('engine.SaveStore.get');
  }

  /** Replaces the document and schedules a write (unless read-only or not loaded yet). */
  update(_change: (document: T) => T): void {
    return notImplemented('engine.SaveStore.update');
  }

  /** Writes a pending change now (the app calls it on 'hidden' and 'pagehide'). */
  flush(): Promise<void> {
    return notImplemented('engine.SaveStore.flush');
  }

  /** Whether the stored document is newer than this app and is never overwritten. */
  get isReadOnly(): boolean {
    return notImplemented('engine.SaveStore.isReadOnly');
  }
}
