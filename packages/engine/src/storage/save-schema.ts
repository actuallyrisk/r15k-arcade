import type { Result } from '../util/result.ts';

/** Migrates a save document from `from` to `from + 1`. */
export interface SaveMigration {
  readonly from: number;
  migrate(document: Readonly<Record<string, unknown>>): Record<string, unknown>;
}

/** Versioned schema of a save document. */
export interface SaveSchema<T> {
  readonly currentVersion: number;
  readonly migrations: readonly SaveMigration[];
  validate(value: unknown): Result<T, readonly string[]>;
  createDefault(): T;
}

/** Nothing stored, no issues: the default document is used. */
interface FreshLoad {
  readonly kind: 'fresh';
}

/** A stored document was loaded (possibly migrated, possibly from the backup slot). */
interface LoadedLoad {
  readonly kind: 'loaded';
  readonly migratedFrom: number | undefined;
  readonly isFromBackupSlot: boolean;
}

/** Nothing intact or an invalid document: defaults are used and the raw text is kept. */
interface RecoveredLoad {
  readonly kind: 'recovered';
  readonly issues: readonly string[];
}

/** The stored document is newer than this app: read-only mode with defaults in memory. */
interface NewerVersionLoad {
  readonly kind: 'newer-version';
  readonly version: number;
}

/** Outcome of SaveStore.load(). */
export type LoadOutcome = FreshLoad | LoadedLoad | RecoveredLoad | NewerVersionLoad;
