import type { FontSource } from '@r15k/engine';

/** The 8 px menu font. Rows 0–1 diacritics, 2–9 caps, 10–12 descenders. */
export const R15K_8: FontSource = {
  id: 'r15k-8',
  metrics: {
    capHeight: 8,
    ascent: 10,
    descent: 3,
    lineHeight: 14,
    letterSpacing: 1,
    spaceWidth: 4,
  },
  fallback: '?',
  glyphs: {
    ' ': '....|....|....|....|....|....|....|....|....|....|....|....|....',
    '?': '.....|.....|.###.|#...#|....#|...#.|..#..|..#..|.....|..#..|.....|.....|.....',
  },
};
