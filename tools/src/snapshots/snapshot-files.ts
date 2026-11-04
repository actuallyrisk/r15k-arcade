// R15K Arcade tools – files around the pixel snapshot run: the palettes every case renders in by default,
// the golden listing for the orphan check, and the failure images in .tmp/snapshots (actual and diff per
// case and palette, uploaded by CI). A run only ever writes or deletes the files of the cases it ran.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PaletteId } from '@r15k/ui';
import { decodePng } from '../png/png-decode.ts';
import { diffImages } from '../png/png-diff.ts';
import { encodePng } from '../png/png-encode.ts';
import type { RgbaImage } from '../png/png-encode.ts';
import { repoPath } from '../shared/repo-paths.ts';
import { goldenPath } from './golden.ts';
import type { SnapshotCase } from './snapshot-case.ts';

/** One entry per palette id; the record type turns a new palette into a compile error here. */
const PALETTE_IDS: Readonly<Record<PaletteId, true>> = {
  light: true,
  dark: true,
  'high-contrast': true,
  'game-boy': true,
};

/** Whether a name is a palette id. */
const isPaletteId = (name: string): name is PaletteId => name in PALETTE_IDS;

/** Every palette, in golden order: the default of a case without `palettes`. */
export const SNAPSHOT_PALETTES: readonly PaletteId[] = Object.keys(PALETTE_IDS).filter(isPaletteId);

/** Folder of the failure images. */
const FAILURE_FOLDER = repoPath('.tmp', 'snapshots');

/** One case rendered in one palette. */
export interface SnapshotRun {
  readonly snapshotCase: SnapshotCase;
  readonly palette: PaletteId;
  /** `<case id>--<palette>`, the golden's file name without extension. */
  readonly name: string;
}

/** Every case × palette (a case's own palette list, else all four). */
export function snapshotRuns(cases: readonly SnapshotCase[]): readonly SnapshotRun[] {
  return cases.flatMap((snapshotCase) =>
    (snapshotCase.palettes ?? SNAPSHOT_PALETTES).map((palette) => ({
      snapshotCase,
      palette,
      name: `${snapshotCase.id}--${palette}`,
    })),
  );
}

/** Golden file names in `folder` that start with `prefix` and belong to no run. */
export function orphanGoldens(
  runs: readonly SnapshotRun[],
  options: { readonly prefix: string; readonly folder?: string },
): readonly string[] {
  const folder = options.folder ?? repoPath('assets', 'goldens');
  if (!existsSync(folder)) {
    return [];
  }
  const expected = new Set(runs.map((run) => `${run.name}.png`));
  return readdirSync(folder)
    .filter((file) => file.endsWith('.png') && file.startsWith(options.prefix))
    .filter((file) => !expected.has(file))
    .sort();
}

/** Paths of the two failure images of a run. */
function failurePaths(run: SnapshotRun): { readonly actual: string; readonly diff: string } {
  return {
    actual: join(FAILURE_FOLDER, `${run.name}.actual.png`),
    diff: join(FAILURE_FOLDER, `${run.name}.diff.png`),
  };
}

/** Writes the actual image and, when a golden exists, the diff image of a failed run. */
export function writeFailureImages(run: SnapshotRun, image: RgbaImage): void {
  const paths = failurePaths(run);
  mkdirSync(FAILURE_FOLDER, { recursive: true });
  writeFileSync(paths.actual, encodePng(image));
  const golden = goldenPath(run.snapshotCase.id, run.palette);
  if (existsSync(golden)) {
    const diff = diffImages(image, decodePng(readFileSync(golden)));
    writeFileSync(paths.diff, encodePng(diff.diffImage));
  } else {
    rmSync(paths.diff, { force: true });
  }
}

/** Deletes the stale failure images of a run that matches again. */
export function removeFailureImages(run: SnapshotRun): void {
  const paths = failurePaths(run);
  rmSync(paths.actual, { force: true });
  rmSync(paths.diff, { force: true });
}
