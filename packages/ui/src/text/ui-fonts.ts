import { compileFont } from '@r15k/engine';
import type { CompiledFont, TextChoice, TextZoom } from '@r15k/engine';
import { R15K_5 } from '../fonts/r15k-5/index.ts';
import { R15K_8 } from '../fonts/r15k-8/index.ts';

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

let compiled: UiFonts | undefined;

/** Both fonts, compiled on first use and cached. */
export function getUiFonts(): UiFonts {
  compiled ??= { small: compileFont(R15K_5), large: compileFont(R15K_8) };
  return compiled;
}

/** The compiled font of a text style. */
export function fontFor(style: TextStyle, fonts: UiFonts): CompiledFont {
  return style.font === 'r15k-5' ? fonts.small : fonts.large;
}

/** An integer zoom capped at 4. */
function cappedZoom(zoom: number): TextZoom {
  if (zoom >= 4) {
    return 4;
  }
  if (zoom === 3) {
    return 3;
  }
  return zoom === 2 ? 2 : 1;
}

/** A layout text choice scaled by an integer factor: zoom = min(4, choice.zoom × factor). */
export function scaledChoice(choice: TextChoice, factor: 1 | 2 | 3 | 4): TextStyle {
  return { font: choice.font, zoom: cappedZoom(choice.zoom * factor) };
}
