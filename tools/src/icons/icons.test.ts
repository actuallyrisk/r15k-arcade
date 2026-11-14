import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { CompiledSprite } from '@r15k/engine';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { decodePng } from '../png/png-decode.ts';
import type { CommandResult } from '../shared/run-command.ts';
import { generateIcons, ICON_PATHS } from './generate-icons.ts';
import { placeCentred, renderIcon } from './render-icon.ts';

/** A 2 × 2 sprite: transparent, slot 1, slot 2, slot 1. */
const SPRITE: CompiledSprite = {
  name: 'app-icon',
  width: 2,
  height: 2,
  frames: [Uint8Array.of(0, 1, 2, 1)],
  mirroredFrames: [Uint8Array.of(1, 0, 1, 2)],
};

/** A LUT whose slot 1 is opaque red and slot 2 opaque blue (0xAABBGGRR). */
const LUT = Uint32Array.from({ length: 256 }, (_unused, slot) =>
  slot === 2 ? 0xffff0000 : 0xff0000ff,
);

const TRANSPARENT = [0, 0, 0, 0];
const RED = [255, 0, 0, 255];
const BLUE = [0, 0, 255, 255];

/** The RGBA bytes of the pixel at (x, y). */
const pixel = (data: Uint8Array, width: number, at: readonly [number, number]): number[] => {
  const offset = (at[1] * width + at[0]) * 4;
  return [...data.subarray(offset, offset + 4)];
};

test('the icon is scaled nearest-neighbour with slot 0 transparent', () => {
  const image = renderIcon(SPRITE, { lut: LUT, scale: 3 });
  expect([image.width, image.height]).toEqual([6, 6]);
  expect(pixel(image.data, 6, [0, 0])).toEqual(TRANSPARENT);
  expect(pixel(image.data, 6, [2, 2])).toEqual(TRANSPARENT);
  expect(pixel(image.data, 6, [3, 0])).toEqual(RED);
  expect(pixel(image.data, 6, [0, 3])).toEqual(BLUE);
  expect(pixel(image.data, 6, [5, 5])).toEqual(RED);
});

test('an image is placed centred, rounded down, on a transparent canvas', () => {
  const image = renderIcon(SPRITE, { lut: LUT, scale: 1 });
  const placed = placeCentred(image, { width: 5, height: 4 });
  expect([placed.width, placed.height]).toEqual([5, 4]);
  expect(pixel(placed.data, 5, [2, 1])).toEqual(RED);
  expect(pixel(placed.data, 5, [1, 2])).toEqual(BLUE);
  expect(pixel(placed.data, 5, [0, 0])).toEqual(TRANSPARENT);
  expect(() => placeCentred(image, { width: 1, height: 4 })).toThrow('does not fit');
});

let root = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'r15k-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Writes a file below the temporary root. */
function put(path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

const RES = 'apps/arcade/src-tauri/gen/android/app/src/main/res';

/** A stand-in for `tauri icon` that writes what the real CLI writes when gen/android exists. */
function fakeTauriIcon(calls: string[][]): (source: string, output: string) => CommandResult {
  return (source, output) => {
    calls.push([source, output]);
    put(`${RES}/mipmap-hdpi/ic_launcher.png`, 'fresh');
    put('apps/arcade/src-tauri/icons/32x32.png', 'fresh');
    return { status: 0, stdout: 'icons done\n', stderr: '' };
  };
}

test('the pipeline renders both sources, runs tauri icon and copies the wide logo', () => {
  const calls: string[][] = [];
  generateIcons({ root, sprite: SPRITE, lut: LUT, runTauriIcon: fakeTauriIcon(calls) });
  expect(calls).toEqual([['../../.tmp/icons/app-icon.png', 'src-tauri/icons']]);
  const icon = decodePng(readFileSync(join(root, ICON_PATHS.sourceFolder, 'app-icon.png')));
  expect([icon.width, icon.height]).toEqual([64, 64]);
  const wide = decodePng(readFileSync(join(root, ICON_PATHS.iconsFolder, 'Wide310x150Logo.png')));
  expect([wide.width, wide.height]).toEqual([310, 150]);
  // The 2 × 2 sprite at scale 4 is 8 × 8, centred at (151, 71).
  expect(pixel(wide.data, 310, [0, 0])).toEqual(TRANSPARENT);
  expect(pixel(wide.data, 310, [151, 71])).toEqual(TRANSPARENT);
  expect(pixel(wide.data, 310, [155, 71])).toEqual(RED);
  expect(pixel(wide.data, 310, [151, 75])).toEqual(BLUE);
  expect(pixel(wide.data, 310, [150, 75])).toEqual(TRANSPARENT);
});

test('with a fake gen/ tree the pipeline never reads icons/android', () => {
  // A file where a folder would be: any attempt to read inside icons/android throws ENOTDIR.
  put('apps/arcade/src-tauri/icons/android', 'stale');
  put(`${RES}/values/colors.xml`, '<resources />');
  generateIcons({ root, sprite: SPRITE, lut: LUT, runTauriIcon: fakeTauriIcon([]) });
  const generated = readdirSync(join(root, RES), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => readFileSync(join(entry.parentPath, entry.name), 'utf8'));
  expect(generated.sort()).toEqual(['<resources />', 'fresh']);
  expect(readFileSync(join(root, 'apps/arcade/src-tauri/icons/android'), 'utf8')).toBe('stale');
});

test('a failing tauri icon run throws with its output and copies nothing', () => {
  const failing = (): CommandResult => ({ status: 1, stdout: '', stderr: 'no such file\n' });
  expect(() => generateIcons({ root, sprite: SPRITE, lut: LUT, runTauriIcon: failing })).toThrow(
    'tauri icon failed (exit 1):\nno such file',
  );
  expect(() => readFileSync(join(root, ICON_PATHS.iconsFolder, 'Wide310x150Logo.png'))).toThrow();
});
