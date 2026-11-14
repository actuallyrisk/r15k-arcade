import type { Logger } from '../logger/logger.ts';
import { err, ok } from '../util/result.ts';
import type { Result } from '../util/result.ts';
import type { LoadOutcome, SaveSchema } from './save-schema.ts';
import type { StorageAdapter, StoredRead } from './storage-adapter.ts';

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

/** Default delay between the first change and its write, in milliseconds. */
const DEFAULT_WRITE_DELAY_MS = 250;

/** A copy of raw stored text that is written before the first save overwrites the original. */
interface Backup {
  readonly key: string;
  readonly text: string;
}

type LoadState = 'unloaded' | 'loading' | 'loaded';

function parseJson(text: string): Result<unknown, string> {
  try {
    return ok(JSON.parse(text));
  } catch (_error: unknown) {
    return err('stored save is not valid JSON');
  }
}

/** The `schemaVersion` of a stored document (a positive integer), else undefined. */
function versionOf(value: unknown): number | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const version = (value as Readonly<Record<string, unknown>>)['schemaVersion'];
  return typeof version === 'number' && Number.isSafeInteger(version) && version >= 1
    ? version
    : undefined;
}

/**
 * One versioned save document with migrations, validation, debounced writes and backups. Writes are
 * serialised; a failed write is logged and retried with the next flush.
 */
export class SaveStore<T> {
  private readonly options: SaveStoreOptions<T>;
  private readonly writeDelayMs: number;
  private document: T;
  private loadState: LoadState = 'unloaded';
  private isReadOnlyMode = false;
  private isDirty = false;
  private backups: Backup[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private writing: Promise<void> = Promise.resolve();

  constructor(options: SaveStoreOptions<T>) {
    this.options = options;
    this.writeDelayMs = options.writeDelayMs ?? DEFAULT_WRITE_DELAY_MS;
    this.document = options.schema.createDefault();
  }

  /** Loads the stored document; called at most once. */
  async load(): Promise<LoadOutcome> {
    if (this.loadState !== 'unloaded') {
      throw new Error('SaveStore.load() may be called only once.');
    }
    this.loadState = 'loading';
    // Changes made before loading stay in memory only: the loaded (or default) document replaces them.
    this.document = this.options.schema.createDefault();
    const outcome = await this.readOutcome();
    this.loadState = 'loaded';
    return outcome;
  }

  /** The in-memory document (before load() resolved: schema.createDefault()). */
  get(): T {
    return this.document;
  }

  /** Replaces the document and schedules a write (unless read-only or not loaded yet). */
  update(change: (document: T) => T): void {
    this.document = change(this.document);
    if (this.loadState !== 'loaded' || this.isReadOnlyMode) {
      return;
    }
    this.isDirty = true;
    // Coalesces changes: the first change starts the timer, so frequent changes never starve a write.
    this.timer ??= setTimeout(() => {
      this.timer = undefined;
      void this.writeQueued();
    }, this.writeDelayMs);
  }

  /** Writes a pending change now (the app calls it on 'hidden' and 'pagehide'). */
  flush(): Promise<void> {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    return this.writeQueued();
  }

  /**
   * Whether writes are off for this session: the stored document is newer than this app, or storage
   * could not be read (so a save that may still be intact is never overwritten).
   */
  get isReadOnly(): boolean {
    return this.isReadOnlyMode;
  }

  private async readOutcome(): Promise<LoadOutcome> {
    const { adapter, logger, key } = this.options;
    let stored: StoredRead;
    try {
      stored = await adapter.read(key);
    } catch (error: unknown) {
      logger.error('save could not be read; continuing read-only with defaults', error);
      this.isReadOnlyMode = true;
      return { kind: 'recovered', issues: ['storage read failed'] };
    }
    if (stored.text !== undefined) {
      return this.decode(stored.text, stored.issues);
    }
    if (stored.issues.length === 0) {
      return { kind: 'fresh' };
    }
    logger.warn('no intact save found; using defaults', stored.issues);
    return { kind: 'recovered', issues: stored.issues };
  }

  private decode(text: string, readIssues: readonly string[]): LoadOutcome {
    const { schema, logger } = this.options;
    const parsed = parseJson(text);
    const version = parsed.ok ? versionOf(parsed.value) : undefined;
    if (!parsed.ok || version === undefined) {
      const issue = parsed.ok ? 'stored save has no schemaVersion' : parsed.error;
      return this.recover(text, [...readIssues, issue]);
    }
    if (version > schema.currentVersion) {
      logger.warn('save is newer than this app; it stays untouched', { version });
      this.isReadOnlyMode = true;
      return { kind: 'newer-version', version };
    }
    const migrated = this.migrate(parsed.value as Readonly<Record<string, unknown>>, version);
    const validated = migrated.ok ? schema.validate(migrated.value) : err([migrated.error]);
    if (!validated.ok) {
      return this.recover(text, [...readIssues, ...validated.error]);
    }
    this.document = validated.value;
    return this.loaded(text, version, readIssues);
  }

  /** A valid document: keeps the pre-migration text as `<key>.v<from>` before the first write. */
  private loaded(text: string, version: number, readIssues: readonly string[]): LoadOutcome {
    const isMigrated = version < this.options.schema.currentVersion;
    if (isMigrated) {
      this.backups.push({ key: `${this.options.key}.v${version}`, text });
    }
    const isFromBackupSlot = readIssues.length > 0;
    if (isFromBackupSlot) {
      this.options.logger.warn('save loaded from the backup slot', readIssues);
    }
    return { kind: 'loaded', migratedFrom: isMigrated ? version : undefined, isFromBackupSlot };
  }

  /** Defaults in memory; the raw text is kept as `<key>.corrupt` before the first write. */
  private recover(text: string, issues: readonly string[]): LoadOutcome {
    this.options.logger.warn('stored save is unusable; using defaults', issues);
    this.backups.push({ key: `${this.options.key}.corrupt`, text });
    return { kind: 'recovered', issues };
  }

  private migrate(
    document: Readonly<Record<string, unknown>>,
    from: number,
  ): Result<Readonly<Record<string, unknown>>, string> {
    const { currentVersion, migrations } = this.options.schema;
    let current = document;
    for (let version = from; version < currentVersion; version += 1) {
      const migration = migrations.find((candidate) => candidate.from === version);
      if (migration === undefined) {
        return err(`no migration from schemaVersion ${version}`);
      }
      try {
        current = migration.migrate(current);
      } catch (error: unknown) {
        this.options.logger.error(`migration from schemaVersion ${version} failed`, error);
        return err(`migration from schemaVersion ${version} failed`);
      }
    }
    return ok(current);
  }

  /** Queues a write behind any running one; resolves when it is done (it never rejects). */
  private writeQueued(): Promise<void> {
    this.writing = this.writing.then(() => this.writePending());
    return this.writing;
  }

  private async writePending(): Promise<void> {
    if (!this.isDirty) {
      return;
    }
    this.isDirty = false;
    const text = JSON.stringify(this.document);
    try {
      for (const backup of [...this.backups]) {
        await this.options.adapter.write(backup.key, backup.text);
        // Dropped only once written, so a failed write keeps it for the retry.
        this.backups = this.backups.slice(1);
      }
      await this.options.adapter.write(this.options.key, text);
    } catch (error: unknown) {
      this.isDirty = true;
      this.options.logger.error('save could not be written; retrying with the next flush', error);
    }
  }
}
