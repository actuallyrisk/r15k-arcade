// A tiny bitmap font for the render tests: cap height 3, one diacritic row above, one descender row.
import type { FontSource } from '../font.ts';

/** Glyph rows: 0 diacritics, 1–3 caps, 4 descender. */
export const TEST_FONT: FontSource = {
  id: 'test-font',
  metrics: {
    capHeight: 3,
    ascent: 4,
    descent: 1,
    lineHeight: 6,
    letterSpacing: 1,
    spaceWidth: 2,
  },
  fallback: '?',
  glyphs: {
    ' ': '.|.|.|.|.',
    '?': '##|.#|..|.#|..',
    '-': '..|..|##|..|..',
    A: '...|.#.|#.#|###|...',
    B: '..|##|##|##|..',
    I: '.|#|#|#|.',
    Ä: '#.#|.#.|#.#|###|...',
    g: '..|..|##|.#|#.',
    '\u{E000}': '###########|#.........#|#.........#|#.........#|###########',
  },
};
