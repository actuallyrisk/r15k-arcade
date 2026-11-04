import type { FontSource } from '@r15k/engine';

/** The 5 px HUD font. Rows 0–1 diacritics, 2–6 caps, 7–8 descenders. */
export const R15K_5: FontSource = {
  id: 'r15k-5',
  metrics: { capHeight: 5, ascent: 7, descent: 2, lineHeight: 10, letterSpacing: 1, spaceWidth: 3 },
  fallback: '?',
  glyphs: {
    ' ': '...|...|...|...|...|...|...|...|...',
    '?': '...|...|###|..#|.#.|...|.#.|...|...',
  },
};
