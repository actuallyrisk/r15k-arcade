// R15K Arcade tools – golden PNGs of the pixel snapshots (assets/goldens/<case id>--<palette>.png).
// Images are compared by decoded pixels, so re-encoding never changes a result; in update mode a golden
// is written only when it is missing or its pixels differ, so unchanged goldens keep their bytes.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { PaletteId } from '@r15k/ui';
import { decodePng } from '../png/png-decode.ts';
import { diffImages } from '../png/png-diff.ts';
import { encodePng } from '../png/png-encode.ts';
import type { RgbaImage } from '../png/png-encode.ts';
import { repoPath } from '../shared/repo-paths.ts';

/** Repository path of a golden. */
export function goldenPath(caseId: string, palette: PaletteId): string {
  return repoPath('assets', 'goldens', `${caseId}--${palette}.png`);
}

/** Different pixels against the golden at `path`; a missing golden counts every pixel. */
function countDifferences(image: RgbaImage, path: string): number {
  if (!existsSync(path)) {
    return image.width * image.height;
  }
  return diffImages(image, decodePng(readFileSync(path))).differentPixels;
}

/** Compares an image with its golden; with `isUpdate` the golden is (re)written when it differs. */
export function compareWithGolden(
  image: RgbaImage,
  path: string,
  options: { readonly isUpdate: boolean },
): { readonly isMatch: boolean; readonly differentPixels: number } {
  const differentPixels = countDifferences(image, path);
  if (differentPixels === 0) {
    return { isMatch: true, differentPixels };
  }
  if (!options.isUpdate) {
    return { isMatch: false, differentPixels };
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePng(image));
  return { isMatch: true, differentPixels };
}
