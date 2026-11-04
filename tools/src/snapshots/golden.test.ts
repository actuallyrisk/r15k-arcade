import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { encodePng } from '../png/png-encode.ts';
import type { RgbaImage } from '../png/png-encode.ts';
import { repoPath } from '../shared/repo-paths.ts';
import { compareWithGolden, goldenPath } from './golden.ts';
import { orphanGoldens, SNAPSHOT_PALETTES, snapshotRuns } from './snapshot-files.ts';
import type { SnapshotCase } from './snapshot-case.ts';

let folder = '';

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'r15k-'));
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

/** A 2×2 image filled with one grey value. */
const greyImage = (value: number): RgbaImage => ({
  width: 2,
  height: 2,
  data: Uint8Array.from({ length: 16 }, (_unused, index) => (index % 4 === 3 ? 255 : value)),
});

/** A case that draws nothing. */
const emptyCase = (id: string, palettes?: SnapshotCase['palettes']): SnapshotCase => ({
  id,
  viewport: 'desktop',
  locale: 'en',
  catalogs: [],
  ...(palettes === undefined ? {} : { palettes }),
  draw: () => undefined,
});

test('goldens live in assets/goldens as <case id>--<palette>.png', () => {
  expect(goldenPath('ui-widgets', 'high-contrast')).toBe(
    repoPath('assets', 'goldens', 'ui-widgets--high-contrast.png'),
  );
});

test('a missing golden fails with every pixel different unless the run updates it', () => {
  const path = join(folder, 'nested', 'case--light.png');
  expect(compareWithGolden(greyImage(9), path, { isUpdate: false })).toEqual({
    isMatch: false,
    differentPixels: 4,
  });
  expect(compareWithGolden(greyImage(9), path, { isUpdate: true })).toEqual({
    isMatch: true,
    differentPixels: 4,
  });
  expect(compareWithGolden(greyImage(9), path, { isUpdate: false })).toEqual({
    isMatch: true,
    differentPixels: 0,
  });
});

test('a differing golden is counted, rewritten only in update mode and only when it differs', () => {
  const path = join(folder, 'case--dark.png');
  writeFileSync(path, encodePng(greyImage(1)));
  expect(compareWithGolden(greyImage(2), path, { isUpdate: false }).differentPixels).toBe(4);
  expect(readFileSync(path)).toEqual(Buffer.from(encodePng(greyImage(1))));
  const before = statSync(path).mtimeMs;
  expect(compareWithGolden(greyImage(1), path, { isUpdate: true }).isMatch).toBe(true);
  expect(statSync(path).mtimeMs).toBe(before);
  compareWithGolden(greyImage(2), path, { isUpdate: true });
  expect(compareWithGolden(greyImage(2), path, { isUpdate: false }).isMatch).toBe(true);
});

test('every case renders in all four palettes unless it names its own', () => {
  expect(SNAPSHOT_PALETTES).toEqual(['light', 'dark', 'high-contrast', 'game-boy']);
  const runs = snapshotRuns([emptyCase('ui-a'), emptyCase('ui-b', ['dark'])]);
  expect(runs.map((run) => run.name)).toEqual([
    'ui-a--light',
    'ui-a--dark',
    'ui-a--high-contrast',
    'ui-a--game-boy',
    'ui-b--dark',
  ]);
});

test('orphan goldens are the PNGs with the prefix that no run produces', () => {
  for (const name of [
    'ui-a--light.png',
    'ui-a--dark.png',
    'ui-old--light.png',
    'bug-hunt-x--light.png',
  ]) {
    writeFileSync(join(folder, name), '');
  }
  writeFileSync(join(folder, 'ui-notes.txt'), '');
  const runs = snapshotRuns([emptyCase('ui-a', ['light', 'dark'])]);
  expect(orphanGoldens(runs, { prefix: 'ui-', folder })).toEqual(['ui-old--light.png']);
  expect(orphanGoldens(runs, { prefix: '', folder })).toEqual([
    'bug-hunt-x--light.png',
    'ui-old--light.png',
  ]);
  expect(orphanGoldens(runs, { prefix: 'tools-', folder })).toEqual([]);
  expect(orphanGoldens([], { prefix: '', folder: join(folder, 'missing') })).toEqual([]);
});
