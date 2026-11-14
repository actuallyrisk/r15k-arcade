import type { FontSource } from '@r15k/engine';
import { R15K_8_BASIC_LATIN } from './basic-latin.ts';
import { R15K_8_EXTENDED } from './extended.ts';
import { R15K_8_ICONS } from './icons.ts';

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
  glyphs: { ...R15K_8_BASIC_LATIN, ...R15K_8_EXTENDED, ...R15K_8_ICONS },
};
