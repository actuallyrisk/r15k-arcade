import { notImplemented } from '../util/assert.ts';
import { ROLE_SLOT_NAMES, SLOT_NAMES } from './slots.ts';
import type { ColorName } from './slots.ts';

/** 0xRRGGBB per token and role slot. */
export type PaletteColors = Readonly<Record<ColorName, number>>;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const COLOR_NAMES: readonly ColorName[] = [...SLOT_NAMES, ...ROLE_SLOT_NAMES];

/** Parses a `#rrggbb` colour into 0xRRGGBB; any other form throws. */
export function parseHexColor(hex: string): number {
  if (!HEX_COLOR.test(hex)) {
    throw new Error(`invalid colour '${hex}': expected #rrggbb`);
  }
  return Number.parseInt(hex.slice(1), 16);
}

/** Parses every colour of a palette written as `#rrggbb` strings. */
export function paletteFromHex(hex: Readonly<Record<ColorName, string>>): PaletteColors {
  return Object.fromEntries(
    COLOR_NAMES.map((name) => [name, parseHexColor(hex[name])]),
  ) as PaletteColors;
}

/**
 * Builds the 256-entry lookup table: entry = 0xFF000000 | b << 16 | g << 8 | r (RGBA byte order on
 * little-endian); slot 0 and unused entries hold the paper colour.
 */
export function buildPaletteLut(_colors: PaletteColors): Uint32Array {
  return notImplemented('engine.buildPaletteLut');
}

/** Whether the platform stores multi-byte integers little-endian (the presenter requires it). */
export function isLittleEndian(): boolean {
  return notImplemented('engine.isLittleEndian');
}
