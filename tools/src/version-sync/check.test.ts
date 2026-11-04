import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { REPO_ROOT } from '../shared/repo-paths.ts';
import {
  cargoLockVersion,
  cargoPackageVersion,
  checkVersionSync,
  hasJsonStringifyLayout,
  workspaceGlobs,
} from './check.ts';

const VERSION = '1.2.3';
const APP_CARGO = 'apps/arcade/src-tauri/Cargo.toml';
const PLUGIN_CARGO = 'plugins/device/Cargo.toml';
const CARGO_LOCK = 'apps/arcade/src-tauri/Cargo.lock';
const TAURI_CONFIG = 'apps/arcade/src-tauri/tauri.conf.json';

let folder = '';

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'r15k-'));
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

/** JSON in release-please's layout. */
const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

/** A Cargo.toml whose dependency table carries a different version on purpose. */
const cargoToml = (name: string, version: string): string =>
  `# header\n[package]\nname = "${name}"\nversion = "${version}"\n\n[dependencies]\nversion = "9.9.9"\n`;

/** A Cargo.lock with both workspace crates and one registry crate. */
const cargoLock = (appVersion: string, pluginVersion: string): string =>
  [
    'version = 4',
    '',
    `[[package]]\nname = "r15k-arcade"\nversion = "${appVersion}"`,
    '[[package]]\nname = "serde"\nversion = "1.0.0"',
    `[[package]]\nname = "tauri-plugin-device"\nversion = "${pluginVersion}"`,
  ].join('\n\n');

/** The extra-files of a complete release-please configuration for the fixture repository. */
function extraFiles(): readonly Readonly<Record<string, string>>[] {
  const lock = (crate: string): Readonly<Record<string, string>> => ({
    type: 'toml',
    path: CARGO_LOCK,
    jsonpath: `$.package[?(@.name.value=='${crate}')].version`,
  });
  return [
    { type: 'json', path: 'packages/engine/package.json', jsonpath: '$.version' },
    { type: 'json', path: 'tools/package.json', jsonpath: '$.version' },
    { type: 'json', path: TAURI_CONFIG, jsonpath: '$.version' },
    { type: 'toml', path: APP_CARGO, jsonpath: '$.package.version' },
    { type: 'toml', path: PLUGIN_CARGO, jsonpath: '$.package.version' },
    lock('r15k-arcade'),
    lock('tauri-plugin-device'),
  ];
}

/** Files of a small repository in which every version is in sync. */
function syncedFiles(): Record<string, string> {
  return {
    '.release-please-manifest.json': json({ '.': VERSION }),
    'release-please-config.json': json({ packages: { '.': { 'extra-files': extraFiles() } } }),
    'pnpm-workspace.yaml': "packages:\n  - packages/*\n  - 'tools'\n\ncatalog:\n  vite: 8.3.5\n",
    'package.json': json({ name: 'root', version: VERSION }),
    'packages/engine/package.json': json({ name: '@r15k/engine', version: VERSION }),
    'tools/package.json': json({ name: '@r15k/tools', version: VERSION }),
    [TAURI_CONFIG]: json({ productName: 'R15K Arcade', version: VERSION }),
    [APP_CARGO]: cargoToml('r15k-arcade', VERSION),
    [PLUGIN_CARGO]: cargoToml('tauri-plugin-device', VERSION),
  };
}

/** Writes the files below the test folder and returns the folder. */
function writeRepository(files: Readonly<Record<string, string>>): string {
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(folder, file)), { recursive: true });
    writeFileSync(join(folder, file), text);
  }
  return folder;
}

test('every manifest of this repository carries the release-please version', () => {
  const report = checkVersionSync(REPO_ROOT);
  expect(report.problems).toEqual([]);
  expect(report.expected).toMatch(/^\d+\.\d+\.\d+$/);
  expect(report.versions.map((found) => found.file)).toEqual(
    expect.arrayContaining([
      'package.json',
      'packages/engine/package.json',
      'packages/ui/package.json',
      'games/bug-hunt/package.json',
      'apps/arcade/package.json',
      'tools/package.json',
      TAURI_CONFIG,
      APP_CARGO,
      PLUGIN_CARGO,
    ]),
  );
});

test('a repository in sync has no problems, with or without Cargo.lock', () => {
  expect(checkVersionSync(writeRepository(syncedFiles())).problems).toEqual([]);
  const report = checkVersionSync(writeRepository({ [CARGO_LOCK]: cargoLock(VERSION, VERSION) }));
  expect(report.problems).toEqual([]);
  expect(report.versions.filter((found) => found.file === CARGO_LOCK)).toHaveLength(2);
});

test('a version that differs from the manifest is reported with its file and field', () => {
  const files = syncedFiles();
  files['tools/package.json'] = json({ name: '@r15k/tools', version: '1.2.2' });
  files[PLUGIN_CARGO] = cargoToml('tauri-plugin-device', '1.0.0');
  files[CARGO_LOCK] = cargoLock(VERSION, '1.0.0');
  expect(checkVersionSync(writeRepository(files)).problems).toEqual([
    'tools/package.json ($.version): 1.2.2 instead of 1.2.3',
    'plugins/device/Cargo.toml ([package] version): 1.0.0 instead of 1.2.3',
    'apps/arcade/src-tauri/Cargo.lock ([[package]] tauri-plugin-device): 1.0.0 instead of 1.2.3',
  ]);
});

test('a missing version and a missing manifest version are reported', () => {
  const files = syncedFiles();
  files[TAURI_CONFIG] = json({ productName: 'R15K Arcade' });
  expect(checkVersionSync(writeRepository(files)).problems).toEqual([
    'apps/arcade/src-tauri/tauri.conf.json ($.version): missing instead of 1.2.3',
  ]);
  writeRepository({ '.release-please-manifest.json': json({ other: VERSION }) });
  expect(checkVersionSync(folder).problems).toEqual([
    '.release-please-manifest.json: no version for "."',
  ]);
});

test('a versioned file that release-please does not update is reported', () => {
  const files = syncedFiles();
  const kept = extraFiles().filter(
    (entry) => entry['path'] !== TAURI_CONFIG && entry['path'] !== APP_CARGO,
  );
  files['release-please-config.json'] = json({ packages: { '.': { 'extra-files': kept } } });
  expect(checkVersionSync(writeRepository(files)).problems).toEqual([
    'release-please-config.json: no json extra-file for apps/arcade/src-tauri/tauri.conf.json ($.version)',
    'release-please-config.json: no toml extra-file for apps/arcade/src-tauri/Cargo.toml ($.package.version)',
  ]);
});

test('an extra-file that does not exist is reported, a missing Cargo.lock is not', () => {
  const files = syncedFiles();
  const entries = [
    ...extraFiles(),
    { type: 'json', path: 'games/gone/package.json', jsonpath: '$.version' },
  ];
  files['release-please-config.json'] = json({ packages: { '.': { 'extra-files': entries } } });
  expect(checkVersionSync(writeRepository(files)).problems).toEqual([
    'games/gone/package.json ($.version): missing instead of 1.2.3',
    'release-please-config.json: extra-file games/gone/package.json does not exist',
  ]);
});

test('a JSON file release-please rewrites in another layout is reported', () => {
  const files = syncedFiles();
  files['packages/engine/package.json'] = `${JSON.stringify({ name: 'e', version: VERSION })}\n`;
  files['.release-please-manifest.json'] = JSON.stringify({ '.': VERSION }, null, 2);
  expect(checkVersionSync(writeRepository(files)).problems).toEqual([
    '.release-please-manifest.json: not stored as JSON.stringify(value, null, 2) with a final newline',
    'packages/engine/package.json: not stored as JSON.stringify(value, null, 2) with a final newline',
  ]);
});

test('hasJsonStringifyLayout accepts only two-space JSON with one final newline', () => {
  expect(hasJsonStringifyLayout('{\n  "a": [\n    1\n  ]\n}\n')).toBe(true);
  expect(hasJsonStringifyLayout('{\n  "a": [1]\n}\n')).toBe(false);
  expect(hasJsonStringifyLayout('{\n    "a": 1\n}\n')).toBe(false);
  expect(hasJsonStringifyLayout('{\n  "a": 1\n}')).toBe(false);
});

test('cargoPackageVersion reads only the [package] table', () => {
  expect(cargoPackageVersion(cargoToml('x', '0.4.0'))).toBe('0.4.0');
  expect(cargoPackageVersion('[package]\r\nname = "x"\r\nversion = "0.5.0"\r\n')).toBe('0.5.0');
  expect(
    cargoPackageVersion('[dependencies]\nversion = "1.0.0"\n[package] # app\nname = "x"\n'),
  ).toBe(undefined);
  expect(cargoPackageVersion('[workspace.package]\nversion = "2.0.0"\n')).toBe(undefined);
});

test('cargoLockVersion reads the entry of the named crate', () => {
  const lock = cargoLock('0.1.0', '0.2.0');
  expect(cargoLockVersion(lock, 'r15k-arcade')).toBe('0.1.0');
  expect(cargoLockVersion(lock, 'tauri-plugin-device')).toBe('0.2.0');
  expect(cargoLockVersion(lock, 'serde')).toBe('1.0.0');
  expect(cargoLockVersion(lock, 'tauri')).toBe(undefined);
});

test('workspaceGlobs reads the packages block list only', () => {
  const yaml =
    '# header\npackages:\n  - apps/*\n  - "games/*" # games\n  - tools\n\ncatalog:\n  - x\n';
  expect(workspaceGlobs(yaml)).toEqual(['apps/*', 'games/*', 'tools']);
  expect(workspaceGlobs('catalog:\n  vite: 8.3.5\n')).toEqual([]);
});
