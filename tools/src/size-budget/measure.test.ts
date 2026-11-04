import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { BUDGETS } from './budgets.ts';
import type { BudgetTable } from './budgets.ts';
import { listFiles, measurePackages, measureWebBuild } from './measure.ts';
import { parsePackageArgs } from './package-args.ts';

let root = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'r15k-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Writes a file below the temporary root (parents created). */
function put(path: string, content: string | Uint8Array): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

const JS = 'export const value = 1;\n'.repeat(200);

/** A small dist folder with every kind of file. */
function writeDist(): void {
  put('dist/index.html', '<!doctype html>');
  put('dist/assets/index-1.js', JS);
  put('dist/assets/chunk-2.js', 'console;');
  put('dist/assets/index-1.js.map', 'x'.repeat(5000));
  put('dist/assets/style.css', 'body{}');
  put('dist/audio/meow-house.mp3', new Uint8Array(1234));
  put('dist/audio/manifest.json', '{}');
}

test('the budgets are the documented starting values', () => {
  expect(BUDGETS).toEqual({
    webJsGzip: 122_880,
    webAssetsRawWithoutAudio: 256_000,
    audioRaw: 3_145_728,
    apkPerAbi: 15_728_640,
    aab: 26_214_400,
    dmg: 26_214_400,
    msix: 15_728_640,
  });
});

test('web JS counts gzip -9, other files raw outside audio, audio raw, source maps never', () => {
  writeDist();
  const gzipped = gzipSync(JS, { level: 9 }).length + gzipSync('console;', { level: 9 }).length;
  expect(measureWebBuild(join(root, 'dist'), BUDGETS)).toEqual([
    { budget: 'webJsGzip', label: 'webJsGzip', bytes: gzipped, limit: 122_880, isWithin: true },
    {
      budget: 'webAssetsRawWithoutAudio',
      label: 'webAssetsRawWithoutAudio',
      bytes: 21,
      limit: 256_000,
      isWithin: true,
    },
    { budget: 'audioRaw', label: 'audioRaw', bytes: 1236, limit: 3_145_728, isWithin: true },
  ]);
});

test('a budget is exceeded one byte above its limit', () => {
  writeDist();
  const tight: BudgetTable = { ...BUDGETS, audioRaw: 1235, webAssetsRawWithoutAudio: 21 };
  const checks = measureWebBuild(join(root, 'dist'), tight);
  expect(checks.map((check) => check.isWithin)).toEqual([true, true, false]);
});

test('a missing build folder throws with a hint', () => {
  expect(() => measureWebBuild(join(root, 'dist'), BUDGETS)).toThrow('build the app first');
});

test('files are listed recursively as sorted slash paths', () => {
  writeDist();
  expect(listFiles(join(root, 'dist'))).toEqual([
    'assets/chunk-2.js',
    'assets/index-1.js',
    'assets/index-1.js.map',
    'assets/style.css',
    'audio/manifest.json',
    'audio/meow-house.mp3',
    'index.html',
  ]);
});

test('native packages are checked raw, each against its own budget', () => {
  put('out/app-arm64.apk', new Uint8Array(10));
  put('out/app.aab', new Uint8Array(30));
  const tight: BudgetTable = { ...BUDGETS, apkPerAbi: 10, aab: 29 };
  const packages = parsePackageArgs([
    '--apk',
    join(root, 'out/app-arm64.apk'),
    '--aab',
    join(root, 'out/app.aab'),
  ]);
  expect(measurePackages(packages, tight)).toEqual([
    { budget: 'apkPerAbi', label: 'apk app-arm64.apk', bytes: 10, limit: 10, isWithin: true },
    { budget: 'aab', label: 'aab app.aab', bytes: 30, limit: 29, isWithin: false },
  ]);
  expect(() => measurePackages([{ kind: 'dmg', path: join(root, 'x.dmg') }], BUDGETS)).toThrow(
    'does not exist',
  );
});

test('package arguments take one or more files per kind', () => {
  expect(parsePackageArgs([])).toEqual([]);
  expect(
    parsePackageArgs(['--apk', 'a.apk', 'b.apk', '--msix', 'c.msix', '--dmg', 'd.dmg']),
  ).toEqual([
    { kind: 'apk', path: 'a.apk' },
    { kind: 'apk', path: 'b.apk' },
    { kind: 'msix', path: 'c.msix' },
    { kind: 'dmg', path: 'd.dmg' },
  ]);
});

test.each([
  [['a.apk'], "unexpected argument 'a.apk'"],
  [['--apk'], '--apk needs at least one file'],
  [['--aab', '--apk', 'a.apk'], '--aab needs at least one file'],
  [['--ipa', 'a.ipa'], "unknown option '--ipa'"],
])('package arguments %j throw', (argv, message) => {
  expect(() => parsePackageArgs(argv)).toThrow(message);
});
