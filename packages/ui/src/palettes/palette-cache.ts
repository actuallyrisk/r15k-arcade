import { buildPaletteLut } from '@r15k/engine';
import { PALETTES } from './palettes.ts';
import type { PaletteId } from './palettes.ts';

const LUTS = new Map<PaletteId, Uint32Array>();

/** The lookup table of a palette, built once per id (callers must not modify it). */
export function getPaletteLut(id: PaletteId): Uint32Array {
  const cached = LUTS.get(id);
  if (cached !== undefined) {
    return cached;
  }
  const lut = buildPaletteLut(PALETTES[id].colors);
  LUTS.set(id, lut);
  return lut;
}
