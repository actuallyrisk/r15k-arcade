import { notImplemented } from '@r15k/engine';
import type { CompiledFont, TextChoice, TextZoom } from '@r15k/engine';

/** The two compiled UI fonts. */
export interface UiFonts {
  /** r15k-5. */
  readonly small: CompiledFont;
  /** r15k-8. */
  readonly large: CompiledFont;
}

/** A font and an effective zoom 1–4; the layout's TextChoice (zoom 1 | 2) is assignable to it. */
export interface TextStyle {
  readonly font: TextChoice['font'];
  readonly zoom: TextZoom;
}

/** Both fonts, compiled once and cached. */
export function getUiFonts(): UiFonts {
  return notImplemented('ui.getUiFonts');
}

/** The compiled font of a text style. */
export function fontFor(_style: TextStyle, _fonts: UiFonts): CompiledFont {
  return notImplemented('ui.fontFor');
}

/** A layout text choice scaled by an integer factor: zoom = min(4, choice.zoom × factor). */
export function scaledChoice(_choice: TextChoice, _factor: 1 | 2 | 3 | 4): TextStyle {
  return notImplemented('ui.scaledChoice');
}
