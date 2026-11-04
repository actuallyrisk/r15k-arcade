// R15K Arcade tools – licences of the Rust crates: `cargo metadata --format-version 1 --locked` for the app
// manifest (one Cargo workspace with plugins/device). Crates without a registry source (the app and our own
// plugin) are dropped. Without cargo the part is SKIPPED (it runs in CI); `--require-rust` turns that into
// a failure. A missing Cargo.lock fails: CI bootstraps it in setup-rust before any cargo call.
import type { CommandResult } from '../shared/run-command.ts';
import { comparePackages, isRecord, stringField } from './third-party.ts';
import type { ThirdPartyPackage } from './third-party.ts';

/** The Cargo manifest of the app, repository-relative. */
export const CARGO_MANIFEST = 'apps/arcade/src-tauri/Cargo.toml';
/** The lockfile cargo metadata needs with --locked. */
export const CARGO_LOCK = 'apps/arcade/src-tauri/Cargo.lock';

/** The exact cargo arguments of the report. */
export const RUST_METADATA_ARGS: readonly string[] = [
  'metadata',
  '--format-version',
  '1',
  '--locked',
  '--manifest-path',
  CARGO_MANIFEST,
];

/** What the Rust part needs from its surroundings (injectable for tests). */
export interface RustEnvironment {
  readonly hasCargo: boolean;
  readonly hasLockfile: boolean;
  /** `--require-rust` (CI): a missing cargo fails instead of skipping. */
  readonly isRustRequired: boolean;
  readonly runCargo: (args: readonly string[]) => CommandResult;
}

/** Outcome of the Rust part. */
export type RustOutcome =
  | { readonly kind: 'ok'; readonly packages: readonly ThirdPartyPackage[] }
  | { readonly kind: 'skipped'; readonly message: string }
  | { readonly kind: 'failed'; readonly message: string };

/** One cargo metadata package as a third-party package; undefined for workspace and path crates. */
function toPackage(entry: Readonly<Record<string, unknown>>): ThirdPartyPackage | undefined {
  if (typeof entry['source'] !== 'string') {
    return undefined;
  }
  return {
    ecosystem: 'cargo',
    name: stringField(entry, 'name'),
    version: stringField(entry, 'version'),
    license: stringField(entry, 'license'),
    repository: stringField(entry, 'repository'),
  };
}

/** Parses cargo metadata JSON into third-party crates, sorted by name and version. */
export function parseCargoMetadata(json: string): readonly ThirdPartyPackage[] {
  const metadata: unknown = JSON.parse(json);
  const entries = isRecord(metadata) ? metadata['packages'] : undefined;
  if (!Array.isArray(entries)) {
    throw new Error('cargo metadata has no packages list');
  }
  return entries
    .filter(isRecord)
    .map(toPackage)
    .filter((item) => item !== undefined)
    .sort(comparePackages);
}

/** Runs the Rust part: skipped without cargo, failed without Cargo.lock or when cargo fails. */
export function collectRustLicences(environment: RustEnvironment): RustOutcome {
  if (!environment.hasCargo) {
    return environment.isRustRequired
      ? { kind: 'failed', message: 'cargo not installed (--require-rust)' }
      : { kind: 'skipped', message: 'SKIPPED (cargo not installed – runs in CI)' };
  }
  if (!environment.hasLockfile) {
    return { kind: 'failed', message: 'Cargo.lock missing – CI bootstraps it in setup-rust' };
  }
  const result = environment.runCargo(RUST_METADATA_ARGS);
  if (result.status !== 0) {
    return { kind: 'failed', message: `cargo metadata failed: ${result.stderr.trim()}` };
  }
  return { kind: 'ok', packages: parseCargoMetadata(result.stdout) };
}
