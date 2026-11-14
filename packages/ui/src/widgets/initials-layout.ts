import type { Rect, TextChoice } from '@r15k/engine';
import { labelWidth } from '../draw/label.ts';
import { capHeightOf } from '../text/text-metrics.ts';
import { scaledChoice } from '../text/ui-fonts.ts';
import type { TextStyle } from '../text/ui-fonts.ts';
import { CONTROL_SHADOW } from './row-layout.ts';

// Geometry of the initials widget that depends on its rect alone, so drawing (which has no touch
// target size) and hit testing (which widens the boxes to the touch target) agree.

/** Characters an initial can take, in the order up/down steps through them. */
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
/** Number of letter boxes. */
export const LETTER_COUNT = 3;

/** The letters with the one at `index` replaced (missing letters are filled with 'A'). */
export function withLetter(letters: string, index: number, char: string): string {
  const padded = letters.padEnd(LETTER_COUNT, 'A').slice(0, LETTER_COUNT);
  return padded.slice(0, index) + char + padded.slice(index + 1);
}

/** Gap between two boxes for a box width. */
function gapFor(boxWidth: number): number {
  return Math.floor(boxWidth / 4);
}

/** Total width of three boxes of `boxWidth` with their gaps and the last box's shadow. */
function totalWidth(boxWidth: number): number {
  return LETTER_COUNT * boxWidth + 2 * gapFor(boxWidth) + CONTROL_SHADOW;
}

/** The three drawn boxes inside a widget rect (each with a shadow right and below). */
export function letterBoxes(rect: Rect): readonly Rect[] {
  let boxWidth = Math.max(1, Math.floor((rect.width - CONTROL_SHADOW) / LETTER_COUNT));
  while (boxWidth > 1 && totalWidth(boxWidth) > rect.width) {
    boxWidth -= 1;
  }
  const gap = Math.floor((rect.width - CONTROL_SHADOW - LETTER_COUNT * boxWidth) / 2);
  const height = Math.max(1, rect.height - CONTROL_SHADOW);
  return Array.from({ length: LETTER_COUNT }, (_, index) => ({
    x: rect.x + index * (boxWidth + gap),
    y: rect.y,
    width: boxWidth,
    height,
  }));
}

/** The letters drawn in the boxes: menu text × 2. */
export function letterStyle(text: TextChoice): TextStyle {
  return scaledChoice(text, 2);
}

/** Inner padding of a box between its border, the arrows and the letter. */
export function boxPadding(text: TextChoice): number {
  return 3 * text.zoom;
}

/** Size of one box: room for the widest letter and the two arrows, at least the touch target. */
export function boxSize(
  minTouchTarget: number,
  text: TextChoice,
): { width: number; height: number } {
  const letters = letterStyle(text);
  const widest = Math.max(...Array.from(ALPHABET, (char) => labelWidth(char, letters)));
  const arrow = Math.max(labelWidth('↑', text), labelWidth('↓', text));
  const padding = boxPadding(text);
  const content = capHeightOf(letters) + 2 * (capHeightOf(text) + 2 * padding);
  return {
    width: Math.max(minTouchTarget, widest + 2 * padding, arrow + 2 * padding),
    height: Math.max(2 * minTouchTarget, content),
  };
}

/** The widget size for boxes of a given size (inverse of letterBoxes). */
export function widgetSizeFor(box: { readonly width: number; readonly height: number }): {
  width: number;
  height: number;
} {
  return { width: totalWidth(box.width), height: box.height + CONTROL_SHADOW };
}
