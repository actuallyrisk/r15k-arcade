// R15K Arcade tools – golden PNGs of the pixel snapshots (assets/goldens/<case id>--<palette>.png).
import { notImplemented } from '@r15k/engine';
import type { PaletteId } from '@r15k/ui';
import type { RgbaImage } from '../png/png-encode.ts';

/** Repository path of a golden. */
export function goldenPath(_caseId: string, _palette: PaletteId): string {
  return notImplemented('tools.goldenPath');
}

/** Compares an image with its golden; with `isUpdate` the golden is (re)written when it differs. */
export function compareWithGolden(
  _image: RgbaImage,
  _path: string,
  _options: { readonly isUpdate: boolean },
): { readonly isMatch: boolean; readonly differentPixels: number } {
  return notImplemented('tools.compareWithGolden');
}
