// R15K Arcade tools – the audio build behind `pnpm assets`: validates the songs and SFX definitions,
// then renders everything unless the manifest in the output folder already carries the current input
// hash (and every file it lists exists). Validator errors fail the build; validator warnings are
// authoring notes that only `--check` prints, as info lines.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SfxDefinition } from '@r15k/engine';
import type { CliOutput } from '../shared/cli-output.ts';
import { readJson } from '../shared/fs-json.ts';
import { printCheckReport } from './check-report.ts';
import { computeInputHash, readSourceFiles } from './input-hash.ts';
import { installedEncoderVersion, MP3_ENCODER_VERSION } from './mp3.ts';
import { loadSongs } from './song-files.ts';
import type { LoadedSong } from './song-files.ts';
import { validateSfxDefinitions } from './validate-sfx.ts';
import { MANIFEST_FILE, writeAudio } from './write-audio.ts';

/** What `pnpm assets` works on and how. */
export interface AssetsOptions {
  readonly songsDir: string;
  readonly outputDir: string;
  readonly sfx: readonly SfxDefinition[];
  /** Render even when the manifest's input hash matches. */
  readonly isForced: boolean;
  /** Only validate songs and SFX definitions and print the report. */
  readonly isCheckOnly: boolean;
  readonly out: CliOutput;
}

/** Prints every validation error; returns whether there was one. */
function reportErrors(
  songs: readonly LoadedSong[],
  sfx: readonly SfxDefinition[],
  out: CliOutput,
): boolean {
  const errors = [
    ...songs.flatMap(({ id, report }) => report.errors.map((error) => `${id}: ${error}`)),
    ...validateSfxDefinitions(sfx),
  ];
  for (const error of errors) {
    out.error(error);
  }
  return errors.length > 0;
}

/** The input hash of this render. */
function inputHashOf(
  songs: readonly LoadedSong[],
  sfx: readonly SfxDefinition[],
  encoderVersion: string,
): string {
  return computeInputHash({
    files: [
      ...readSourceFiles(import.meta.dirname, 'song-render'),
      ...songs.map(({ id, text }) => ({ path: `songs/${id}.json`, text })),
    ],
    sfx,
    encoderVersion,
    nodeMajor: process.versions.node.split('.')[0] ?? '',
  });
}

/** Whether a parsed JSON value is an object. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whether a parsed JSON value is an array. */
function isList(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

/** The files a manifest lists, or undefined when its hash differs or its shape is unknown. */
function listedFiles(value: unknown, inputHash: string): readonly string[] | undefined {
  if (!isRecord(value) || value['inputHash'] !== inputHash) {
    return undefined;
  }
  const { music, sfx } = value;
  if (!isList(music) || !isList(sfx)) {
    return undefined;
  }
  return [...music, ...sfx]
    .filter(isRecord)
    .flatMap((entry) => [entry['file'], entry['metadata']])
    .filter((path) => typeof path === 'string');
}

/** Whether the output folder holds a complete render for `inputHash`. */
function isUpToDate(outputDir: string, inputHash: string): boolean {
  const manifestPath = join(outputDir, MANIFEST_FILE);
  if (!existsSync(manifestPath)) {
    return false;
  }
  let manifest: unknown;
  try {
    manifest = readJson(manifestPath);
  } catch {
    // An unreadable manifest belongs to an interrupted or foreign render: render again.
    return false;
  }
  const files = listedFiles(manifest, inputHash);
  return files?.every((file) => existsSync(join(outputDir, file))) === true;
}

/** Runs the audio build; resolves to the exit code. */
export async function runAssets(options: AssetsOptions): Promise<0 | 1> {
  const { out, sfx } = options;
  const songs = loadSongs(options.songsDir);
  if (reportErrors(songs, sfx, out)) {
    return 1;
  }
  if (options.isCheckOnly) {
    printCheckReport(songs, sfx, out);
    return 0;
  }
  const encoderVersion = installedEncoderVersion();
  if (encoderVersion !== MP3_ENCODER_VERSION) {
    out.error(
      `wasm-media-encoders ${encoderVersion} is installed; the renderer expects ${MP3_ENCODER_VERSION}`,
    );
    return 1;
  }
  const inputHash = inputHashOf(songs, sfx, encoderVersion);
  if (!options.isForced && isUpToDate(options.outputDir, inputHash)) {
    out.info('audio up to date');
    return 0;
  }
  const valid = songs.flatMap(({ id, song }) => (song === undefined ? [] : [{ id, song }]));
  await writeAudio({ outputDir: options.outputDir, songs: valid, sfx, inputHash, out });
  return 0;
}
