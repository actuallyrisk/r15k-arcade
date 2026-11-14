import { expect, test } from 'vitest';
import type { CommandResult } from '../shared/run-command.ts';
import {
  collectJsLicences,
  completenessIssues,
  JS_LICENCE_ARGS,
  parseJsLicenceReport,
} from './js-licences.ts';

const TAURI_RUNTIME = [
  '@tauri-apps/api',
  '@tauri-apps/plugin-opener',
  '@tauri-apps/plugin-os',
  '@tauri-apps/plugin-store',
];

/** A report entry in the layout of `pnpm licenses list --json`. */
const entry = (name: string, versions: readonly string[], license: string): object => ({
  name,
  versions,
  paths: versions.map((version) => `/store/${name}@${version}`),
  license,
  homepage: `https://github.com/example/${name}#readme`,
});

/** A full report with the four Tauri runtime packages and a workspace package. */
const FULL_REPORT = JSON.stringify({
  'Apache-2.0 OR MIT': [entry('@tauri-apps/api', ['2.12.4'], 'Apache-2.0 OR MIT')],
  'MIT OR Apache-2.0': TAURI_RUNTIME.slice(1).map((name) =>
    entry(name, ['2.5.0'], 'MIT OR Apache-2.0'),
  ),
  MIT: [entry('@r15k/engine', ['0.1.0'], 'MIT'), entry('tslib', ['2.8.0', '2.8.1'], 'MIT')],
});

/** The report without @tauri-apps/api. */
const REPORT_WITHOUT_API = JSON.stringify({
  'MIT OR Apache-2.0': TAURI_RUNTIME.slice(1).map((name) =>
    entry(name, ['2.5.0'], 'MIT OR Apache-2.0'),
  ),
});

test('the report is read recursively over every workspace project, production dependencies only', () => {
  expect(JS_LICENCE_ARGS).toEqual(['licenses', 'list', '--recursive', '--prod', '--json']);
  const calls: (readonly string[])[] = [];
  const run = (args: readonly string[]): CommandResult => {
    calls.push(args);
    return { status: 0, stdout: FULL_REPORT, stderr: '' };
  };
  expect(collectJsLicences(run)).toHaveLength(6);
  expect(calls).toEqual([['licenses', 'list', '--recursive', '--prod', '--json']]);
});

test('the parsed report has one package per version, without workspace packages, sorted', () => {
  const packages = parseJsLicenceReport(FULL_REPORT);
  expect(packages.map((item) => `${item.name}@${item.version}`)).toEqual([
    '@tauri-apps/api@2.12.4',
    '@tauri-apps/plugin-opener@2.5.0',
    '@tauri-apps/plugin-os@2.5.0',
    '@tauri-apps/plugin-store@2.5.0',
    'tslib@2.8.0',
    'tslib@2.8.1',
  ]);
  expect(packages[0]).toEqual({
    ecosystem: 'npm',
    name: '@tauri-apps/api',
    version: '2.12.4',
    license: 'Apache-2.0 OR MIT',
    repository: 'https://github.com/example/@tauri-apps/api',
  });
});

test('a report with every runtime dependency passes the completeness check', () => {
  const packages = parseJsLicenceReport(FULL_REPORT);
  expect(completenessIssues(packages, [...TAURI_RUNTIME, '@r15k/engine'])).toEqual([]);
});

test('a report without @tauri-apps/api fails the completeness check', () => {
  const packages = parseJsLicenceReport(REPORT_WITHOUT_API);
  expect(completenessIssues(packages, TAURI_RUNTIME)).toEqual([
    'licence report incomplete: @tauri-apps/api',
  ]);
  expect(completenessIssues(parseJsLicenceReport('{}'), TAURI_RUNTIME)).toHaveLength(4);
});

test('a failing pnpm run and a malformed report throw', () => {
  const failing = (): CommandResult => ({ status: 1, stdout: '', stderr: 'boom\n' });
  expect(() => collectJsLicences(failing)).toThrow('failed: boom');
  expect(() => parseJsLicenceReport('[]')).toThrow('not a JSON object');
  expect(() => parseJsLicenceReport('{"MIT": {}}')).toThrow("group 'MIT' is not a list");
});
