import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseAudioManifest, parseMusicMetadata } from '@r15k/engine';
import { afterEach, beforeEach, expect, test } from 'vitest';
import type { CliOutput } from '../shared/cli-output.ts';
import { repoPath } from '../shared/repo-paths.ts';
import { findWarningLines } from '../verify/warnings.ts';
import { runAssets } from './run-assets.ts';
import type { AssetsOptions } from './run-assets.ts';
import { ALL_SFX } from './sfx-sources.ts';

let folder = '';
let lines: string[] = [];

/** Output that records every line with the prefixes the real output uses. */
const OUTPUT: CliOutput = {
  info: (text) => lines.push(text),
  warn: (text) => lines.push(`warning: ${text}`),
  error: (text) => lines.push(`error: ${text}`),
  table: () => undefined,
};

/** Options for a run on the shipped songs into the temporary folder. */
const options = (overrides: Partial<AssetsOptions> = {}): AssetsOptions => ({
  songsDir: repoPath('assets', 'songs'),
  outputDir: join(folder, 'audio'),
  sfx: ALL_SFX,
  isForced: false,
  isCheckOnly: false,
  out: OUTPUT,
  ...overrides,
});

/** Every file below the output folder with its size. */
const outputFiles = (): ReadonlyMap<string, number> => {
  const root = join(folder, 'audio');
  const files = readdirSync(root, { recursive: true, encoding: 'utf8' }).filter((file) =>
    statSync(join(root, file)).isFile(),
  );
  return new Map(
    files.map((file) => [file.replaceAll('\\', '/'), statSync(join(root, file)).size]),
  );
};

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'r15k-'));
  lines = [];
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

test('a render writes 16 WAV files, the music with its metadata and the manifest, under 1 MB', async () => {
  expect(await runAssets(options())).toBe(0);
  const files = outputFiles();
  expect(
    [...files.keys()].filter((file) => file.startsWith('sfx/') && file.endsWith('.wav')),
  ).toHaveLength(16);
  expect([...files.keys()].filter((file) => !file.startsWith('sfx/')).sort()).toEqual([
    'manifest.json',
    'music/meow-house.json',
    'music/meow-house.mp3',
  ]);
  expect([...files.values()].reduce((sum, size) => sum + size, 0)).toBeLessThan(1024 * 1024);
  expect(findWarningLines(lines.join('\n'))).toEqual([]);
  expect(lines.some((line) => line.startsWith('note:'))).toBe(false);
});

test('the manifest and the metadata pass the parsers of the mixer and match the files', async () => {
  await runAssets(options());
  const read = (file: string): unknown =>
    JSON.parse(readFileSync(join(folder, 'audio', file), 'utf8'));
  const manifest = parseAudioManifest(read('manifest.json'));
  const metadata = parseMusicMetadata(read('music/meow-house.json'));
  expect(manifest.ok && metadata.ok).toBe(true);
  if (manifest.ok && metadata.ok) {
    expect(manifest.value.music).toEqual([
      { id: 'meow-house', file: 'music/meow-house.mp3', metadata: 'music/meow-house.json' },
    ]);
    expect(manifest.value.sfx.map(({ id }) => id)).toEqual(ALL_SFX.map(({ id }) => id));
    expect(metadata.value.inputHash).toBe(manifest.value.inputHash);
    expect(metadata.value).toMatchObject({
      pcmLength: 1_486_452 + 72_000,
      loopStartSample: 24_000,
      loopEndSample: 1_510_452,
    });
  }
});

test('a second run finds the matching hash; --force and a missing file render again', async () => {
  await runAssets(options());
  lines = [];
  expect(await runAssets(options())).toBe(0);
  expect(lines).toEqual(['audio up to date']);
  lines = [];
  await runAssets(options({ isForced: true }));
  expect(lines[0]).toMatch(/^sfx: 16 WAV files/);
  rmSync(join(folder, 'audio', 'sfx', 'tick.wav'));
  lines = [];
  await runAssets(options());
  expect(lines[0]).toMatch(/^sfx: 16 WAV files/);
});

test('a manifest from other inputs or an unreadable one is replaced', async () => {
  await runAssets(options());
  const manifestPath = join(folder, 'audio', 'manifest.json');
  writeFileSync(
    manifestPath,
    readFileSync(manifestPath, 'utf8').replace(/"inputHash": "\w+"/, '"inputHash": "00000000"'),
  );
  lines = [];
  await runAssets(options());
  expect(lines[0]).toMatch(/^sfx: /);
  writeFileSync(manifestPath, '{ broken');
  lines = [];
  await runAssets(options());
  expect(lines[0]).toMatch(/^sfx: /);
});

test('--check prints exactly the one authoring note of Meow House as info and writes nothing', async () => {
  expect(await runAssets(options({ isCheckOnly: true }))).toBe(0);
  expect(lines.filter((line) => line.startsWith('note:'))).toEqual([
    'note: meow-house: B: only 0 meow(s) - the hook should actually meow',
  ]);
  expect(findWarningLines(lines.join('\n'))).toEqual([]);
  expect(lines).toContain('sfx: 16 definitions valid');
  expect(readdirSync(folder)).toEqual([]);
});

test('validation errors of songs and effects fail the run and are printed as errors', async () => {
  const songsDir = join(folder, 'songs');
  mkdirSync(songsDir);
  writeFileSync(join(songsDir, 'broken.json'), '{ "name": "Broken" ');
  writeFileSync(
    join(songsDir, 'slow.json'),
    JSON.stringify({ name: 'Slow', bpm: 60, key: 'C', sections: {}, order: [] }),
  );
  const sfx = [{ id: 'Bad', tones: [] }];
  expect(await runAssets(options({ songsDir, sfx }))).toBe(1);
  expect(lines.filter((line) => line.startsWith('error: '))).toEqual([
    expect.stringMatching(/^error: broken: /),
    'error: slow: bpm must be a number 90..190',
    'error: slow: order missing',
    "error: sfx 'Bad': the id must be lower-case words joined by hyphens",
    "error: sfx 'Bad': no tones",
  ]);
});
