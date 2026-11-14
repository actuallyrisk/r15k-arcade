import type { FontSource } from '@r15k/engine';
import { R15K_5_BASIC_LATIN } from './basic-latin.ts';
import { R15K_5_EXTENDED } from './extended.ts';
import { R15K_5_ICONS } from './icons.ts';

/**
 * The 5 px HUD font. Rows 0–1 diacritics, 2–6 caps, 7–8 descenders. Its digits, A–Z and `: ! ? + - . /`
 * are the glyphs of the original 404 game; everything else extends that style.
 */
export const R15K_5: FontSource = {
  id: 'r15k-5',
  metrics: { capHeight: 5, ascent: 7, descent: 2, lineHeight: 10, letterSpacing: 1, spaceWidth: 3 },
  fallback: '?',
  glyphs: { ...R15K_5_BASIC_LATIN, ...R15K_5_EXTENDED, ...R15K_5_ICONS },
};
