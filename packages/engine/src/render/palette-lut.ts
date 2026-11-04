import { COLOR_NAMES, colorSlot } from './color-slots.ts';
import type { ColorName } from './slots.ts';

/** 0xRRGGBB per token and role slot. */
export type PaletteColors = Readonly<Record<ColorName, number>>;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const LUT_SIZE = 256;

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

/** 0xRRGGBB → opaque 0xAABBGGRR, which a little-endian Uint32Array view stores as R, G, B, A bytes. */
function toRgbaWord(color: number): number {
  const red = (color >>> 16) & 0xff;
  const green = (color >>> 8) & 0xff;
  const blue = color & 0xff;
  return (0xff000000 | (blue << 16) | (green << 8) | red) >>> 0;
}

/**
 * Builds the 256-entry lookup table: entry = 0xFF000000 | b << 16 | g << 8 | r (RGBA byte order on
 * little-endian); slot 0 and unused entries hold the paper colour.
 */
export function buildPaletteLut(colors: PaletteColors): Uint32Array {
  const lut = new Uint32Array(LUT_SIZE).fill(toRgbaWord(colors.paper));
  for (const name of COLOR_NAMES) {
    lut[colorSlot(name)] = toRgbaWord(colors[name]);
  }
  return lut;
}

/** Whether the platform stores multi-byte integers little-endian (the presenter requires it). */
export function isLittleEndian(): boolean {
  return new Uint8Array(new Uint32Array([0x01020304]).buffer)[0] === 0x04;
}
