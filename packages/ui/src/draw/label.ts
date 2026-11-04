import { notImplemented } from '@r15k/engine';
import type { DrawTarget, SlotIndex } from '@r15k/engine';
import type { TextStyle } from '../text/ui-fonts.ts';

/** How a label is drawn. */
export interface LabelOptions {
  readonly style: TextStyle;
  readonly slot: SlotIndex;
  readonly x: number;
  readonly y: number;
  readonly align?: 'left' | 'center' | 'right';
  readonly shadowSlot?: SlotIndex;
}

/** Draws `text.toUpperCase()` with the UI fonts (the single upper-casing point of all pixel text). */
export function drawLabel(_target: DrawTarget, _text: string, _options: LabelOptions): number {
  return notImplemented('ui.drawLabel');
}

/** Width of `text.toUpperCase()` in a text style. */
export function labelWidth(_text: string, _style: TextStyle): number {
  return notImplemented('ui.labelWidth');
}

/** Wraps the upper-cased text (so measured and drawn strings agree, e.g. 'ß' → 'SS'). */
export function wrapLabel(
  _text: string,
  _options: { readonly style: TextStyle; readonly maxWidth: number },
): readonly string[] {
  return notImplemented('ui.wrapLabel');
}
