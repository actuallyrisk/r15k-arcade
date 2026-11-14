import type { FontMetrics } from '@r15k/engine';
import { R15K_5 } from '../fonts/r15k-5/index.ts';
import { R15K_8 } from '../fonts/r15k-8/index.ts';
import type { TextStyle } from './ui-fonts.ts';

// Font metrics without compiling the fonts, for geometry that only needs heights and spacing.

/** The metrics of a text style's font (unscaled). */
export function fontMetrics(style: Pick<TextStyle, 'font'>): FontMetrics {
  return style.font === 'r15k-5' ? R15K_5.metrics : R15K_8.metrics;
}

/** Cap height of a text style in logical px (capHeight × zoom). */
export function capHeightOf(style: TextStyle): number {
  return fontMetrics(style).capHeight * style.zoom;
}

/** Width of one space of a text style in logical px (spaceWidth × zoom). */
export function spaceWidthOf(style: TextStyle): number {
  return fontMetrics(style).spaceWidth * style.zoom;
}
