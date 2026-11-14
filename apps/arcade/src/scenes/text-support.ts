import { fontFor, getUiFonts, labelWidth, scaledChoice } from '@r15k/ui';
import type { TextStyle } from '@r15k/ui';
import type { TextChoice } from '@r15k/engine';

/** Cap height of a text style in logical px (the height of upper-case pixel text). */
export function capHeightOf(style: TextStyle): number {
  return fontFor(style, getUiFonts()).metrics.capHeight * style.zoom;
}

/** The largest of the factors whose scaled style keeps `text` within `maxWidth` (else factor 1). */
export function fittingStyle(
  text: string,
  choice: TextChoice,
  options: { readonly factors: readonly (1 | 2 | 3 | 4)[]; readonly maxWidth: number },
): TextStyle {
  for (const factor of options.factors) {
    const style = scaledChoice(choice, factor);
    if (labelWidth(text, style) <= options.maxWidth) {
      return style;
    }
  }
  return scaledChoice(choice, 1);
}

/** Distance between the cap lines of two wrapped lines (room for umlaut dots above the caps). */
export function lineStepOf(style: TextStyle): number {
  return capHeightOf(style) + 3 * style.zoom + 1;
}

/** Height of a block of wrapped lines. */
export function blockHeightOf(lineCount: number, style: TextStyle): number {
  return lineCount === 0 ? 0 : (lineCount - 1) * lineStepOf(style) + capHeightOf(style);
}
