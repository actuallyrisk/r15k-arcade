// R15K Arcade tools – fixture fonts for the i18n-check tests: every glyph a solid block of one width, so
// text widths are easy to compute (n glyphs of width w with letter spacing 1: n·(w + 1) − 1 per zoom).
import type { FontSource } from '@r15k/engine';

/** Cell rows of the fixture fonts (ascent 2 + descent 1). */
const CELL_ROWS = 3;

/** A glyph `width` pixels wide, solid in every row. */
const solid = (width: number): string =>
  Array.from({ length: CELL_ROWS }, () => '#'.repeat(width)).join('|');

/** A font with the given characters, each glyph `width` wide, plus space and the fallback. */
export function fixtureFont(id: string, chars: string, width = 3): FontSource {
  const glyphs: Record<string, string> = {
    ' ': Array.from({ length: CELL_ROWS }, () => '...').join('|'),
    '?': solid(width),
  };
  for (const char of chars) {
    glyphs[char] = solid(width);
  }
  return {
    id,
    metrics: {
      capHeight: 2,
      ascent: 2,
      descent: 1,
      lineHeight: 4,
      letterSpacing: 1,
      spaceWidth: 3,
    },
    fallback: '?',
    glyphs,
  };
}
