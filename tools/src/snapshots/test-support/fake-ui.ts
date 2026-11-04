// R15K Arcade tools – stand-in for the ui package in the harness test: a hand-built 256-entry LUT per
// palette (entry = palette number in blue, slot index in red, opaque) and a tiny one-glyph test font.
import type { CompiledFont, CompiledGlyph } from '@r15k/engine';

/** The palette ids the fake knows, numbered for the LUT. */
const PALETTE_NUMBERS: Readonly<Record<string, number>> = {
  light: 1,
  dark: 2,
  'high-contrast': 3,
  'game-boy': 4,
};

/** The LUT entry of a slot in a palette: R = slot, G = 0, B = palette number, A = 255. */
export function fakeLutEntry(palette: string, slot: number): number {
  return (0xff000000 | ((PALETTE_NUMBERS[palette] ?? 0) << 16) | slot) >>> 0;
}

/** A 256-entry LUT built from fakeLutEntry. */
export function getPaletteLut(palette: string): Uint32Array {
  return Uint32Array.from({ length: 256 }, (_unused, slot) => fakeLutEntry(palette, slot));
}

/** A font whose every glyph is one ink pixel wide and one cell high. */
function testFont(id: string): CompiledFont {
  const glyph: CompiledGlyph = { width: 1, bits: Uint8Array.of(1) };
  return {
    id,
    metrics: {
      capHeight: 1,
      ascent: 1,
      descent: 0,
      lineHeight: 2,
      letterSpacing: 1,
      spaceWidth: 1,
    },
    cellHeight: 1,
    glyph: () => glyph,
    has: () => true,
  };
}

const FONTS = { small: testFont('test-small'), large: testFont('test-large') };

/** The two test fonts (always the same objects). */
export function getUiFonts(): typeof FONTS {
  return FONTS;
}
