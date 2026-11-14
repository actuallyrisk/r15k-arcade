import { expect, test } from 'vitest';
import type { CommandResult } from '../shared/run-command.ts';
import { collectRustLicences, parseCargoMetadata, RUST_METADATA_ARGS } from './rust-licences.ts';
import type { RustEnvironment } from './rust-licences.ts';

const REGISTRY = 'registry+https://github.com/rust-lang/crates.io-index';

/** Cargo metadata with the app, our plugin and two registry crates. */
const METADATA = JSON.stringify({
  packages: [
    { name: 'r15k-arcade', version: '0.1.0', license: 'MIT', source: null, repository: null },
    { name: 'tauri-plugin-device', version: '0.1.0', license: 'MIT', source: null },
    {
      name: 'tauri',
      version: '2.12.5',
      license: 'Apache-2.0 OR MIT',
      source: REGISTRY,
      repository: 'https://github.com/tauri-apps/tauri',
    },
    { name: 'serde', version: '1.0.0', license: 'MIT OR Apache-2.0', source: REGISTRY },
  ],
  workspace_members: [],
});

/** An environment with cargo and a lockfile whose cargo prints `result`. */
function environment(overrides: Partial<RustEnvironment> = {}): RustEnvironment {
  return {
    hasCargo: true,
    hasLockfile: true,
    isRustRequired: false,
    runCargo: (): CommandResult => ({ status: 0, stdout: METADATA, stderr: '' }),
    ...overrides,
  };
}

test('cargo metadata is read locked for the app manifest', () => {
  expect(RUST_METADATA_ARGS).toEqual([
    'metadata',
    '--format-version',
    '1',
    '--locked',
    '--manifest-path',
    'apps/arcade/src-tauri/Cargo.toml',
  ]);
});

test('registry crates are reported, the app and our plugin are dropped', () => {
  expect(parseCargoMetadata(METADATA)).toEqual([
    {
      ecosystem: 'cargo',
      name: 'serde',
      version: '1.0.0',
      license: 'MIT OR Apache-2.0',
      repository: '',
    },
    {
      ecosystem: 'cargo',
      name: 'tauri',
      version: '2.12.5',
      license: 'Apache-2.0 OR MIT',
      repository: 'https://github.com/tauri-apps/tauri',
    },
  ]);
  expect(() => parseCargoMetadata('{}')).toThrow('no packages list');
});

test('with cargo and a lockfile the crates are collected', () => {
  const calls: (readonly string[])[] = [];
  const outcome = collectRustLicences(
    environment({
      runCargo: (args) => {
        calls.push(args);
        return { status: 0, stdout: METADATA, stderr: '' };
      },
    }),
  );
  expect(outcome.kind === 'ok' && outcome.packages.map((item) => item.name)).toEqual([
    'serde',
    'tauri',
  ]);
  expect(calls).toEqual([RUST_METADATA_ARGS]);
});

test('without cargo the Rust part is skipped, or fails with --require-rust', () => {
  expect(collectRustLicences(environment({ hasCargo: false }))).toEqual({
    kind: 'skipped',
    message: 'SKIPPED (cargo not installed – runs in CI)',
  });
  expect(collectRustLicences(environment({ hasCargo: false, isRustRequired: true }))).toEqual({
    kind: 'failed',
    message: 'cargo not installed (--require-rust)',
  });
});

test('a missing Cargo.lock and a failing cargo fail', () => {
  expect(collectRustLicences(environment({ hasLockfile: false }))).toEqual({
    kind: 'failed',
    message: 'Cargo.lock missing – CI bootstraps it in setup-rust',
  });
  const failing = (): CommandResult => ({
    status: 101,
    stdout: '',
    stderr: 'error: lock out of date\n',
  });
  expect(collectRustLicences(environment({ runCargo: failing }))).toEqual({
    kind: 'failed',
    message: 'cargo metadata failed: error: lock out of date',
  });
});
