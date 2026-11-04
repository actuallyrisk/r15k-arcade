import { notImplemented } from '@r15k/engine';
import type { PaletteId } from './palettes.ts';

/** The lookup table of a palette, built once per id. */
export function getPaletteLut(_id: PaletteId): Uint32Array {
  return notImplemented('ui.getPaletteLut');
}
