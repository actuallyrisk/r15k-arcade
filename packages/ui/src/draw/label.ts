import { drawText, measureText, wrapText } from '@r15k/engine';
import type { DrawTarget, DrawTextOptions, SlotIndex } from '@r15k/engine';
import { fontFor, getUiFonts } from '../text/ui-fonts.ts';
import type { TextStyle } from '../text/ui-fonts.ts';

/** How a label is drawn. */
export interface LabelOptions {
  readonly style: TextStyle;
  readonly slot: SlotIndex;
  readonly x: number;
  /** Cap line (top of the capital letters). */
  readonly y: number;
  readonly align?: 'left' | 'center' | 'right';
  /** Hard shadow drawn first, offset max(1, zoom >> 1) right and down. */
  readonly shadowSlot?: SlotIndex;
}

/** Pixel text is set in upper case ('ß' becomes 'SS'); catalogs keep their case. */
function toDrawn(text: string): string {
  return text.toUpperCase();
}

/**
 * Draws `text.toUpperCase()` with the UI fonts and returns its width. This is the single point where
 * pixel text is upper-cased, so drawn and measured strings always agree.
 */
export function drawLabel(target: DrawTarget, text: string, options: LabelOptions): number {
  const { style } = options;
  const textOptions: DrawTextOptions = {
    font: fontFor(style, getUiFonts()),
    slot: options.slot,
    x: options.x,
    y: options.y,
    zoom: style.zoom,
    ...(options.align === undefined ? {} : { align: options.align }),
    ...(options.shadowSlot === undefined ? {} : { shadowSlot: options.shadowSlot }),
  };
  return drawText(target, toDrawn(text), textOptions);
}

/** Width of `text.toUpperCase()` in a text style. */
export function labelWidth(text: string, style: TextStyle): number {
  return measureText(fontFor(style, getUiFonts()), toDrawn(text), style.zoom);
}

/**
 * Wraps the upper-cased text at `maxWidth` (so measured and drawn strings agree, e.g. 'ß' → 'SS') and
 * returns the upper-cased lines.
 */
export function wrapLabel(
  text: string,
  options: { readonly style: TextStyle; readonly maxWidth: number },
): readonly string[] {
  const { style, maxWidth } = options;
  return wrapText(fontFor(style, getUiFonts()), toDrawn(text), { maxWidth, zoom: style.zoom });
}
