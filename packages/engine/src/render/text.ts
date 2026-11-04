import { notImplemented } from '../util/assert.ts';
import type { DrawTarget } from './draw-target.ts';
import type { CompiledFont } from './font.ts';
import type { SlotIndex } from './slots.ts';

/** Integer pixel multiplication of text (still pixel-exact). */
export type TextZoom = 1 | 2 | 3 | 4;

/** How a string is drawn. */
export interface DrawTextOptions {
  readonly font: CompiledFont;
  readonly slot: SlotIndex;
  readonly x: number;
  /** Cap line (top of capital letters). */
  readonly y: number;
  readonly zoom?: TextZoom;
  /** Relative to x. */
  readonly align?: 'left' | 'center' | 'right';
  /** Hard shadow drawn first. */
  readonly shadowSlot?: SlotIndex;
  /** Default max(1, zoom >> 1), both axes. */
  readonly shadowOffset?: number;
}

/** Draws a string and returns its width. */
export function drawText(_target: DrawTarget, _text: string, _options: DrawTextOptions): number {
  return notImplemented('engine.drawText');
}

/**
 * Width of a string: Σ(glyph width + letterSpacing) − letterSpacing, times zoom; '' is 0; iterates code
 * points.
 */
export function measureText(_font: CompiledFont, _text: string, _zoom?: TextZoom): number {
  return notImplemented('engine.measureText');
}

/**
 * Greedy word wrap at spaces and after '-'; words wider than maxWidth are broken by code point, '\n'
 * forces a break.
 */
export function wrapText(
  _font: CompiledFont,
  _text: string,
  _options: { readonly maxWidth: number; readonly zoom?: TextZoom },
): readonly string[] {
  return notImplemented('engine.wrapText');
}
