import { DEFAULT_LAYOUT_RULES } from '@r15k/engine';
import type { Layout, TextChoice } from '@r15k/engine';
import { scaledChoice } from '@r15k/ui';
import type { TextStyle } from '@r15k/ui';
import { TUNING } from '../content/tuning.ts';

/** What a text of the round is; the role picks its font and zoom. */
export type RoundTextRole =
  | 'hud-label'
  | 'hud-value'
  | 'hud-value-large'
  | 'popup'
  | 'hint'
  | 'countdown-label'
  | 'countdown-digit'
  | 'banner';

/** Cap height of a font at zoom 1, from the layout's text candidates (the fonts are tested against them). */
function baseCapHeight(font: TextChoice['font']): number {
  const candidates = [
    ...DEFAULT_LAYOUT_RULES.hudCandidates,
    ...DEFAULT_LAYOUT_RULES.menuCandidates,
  ];
  const candidate = candidates.find((entry) => entry.choice.font === font);
  if (candidate === undefined) {
    throw new Error(`no layout text candidate for font ${font}`);
  }
  return candidate.capHeight / candidate.choice.zoom;
}

/** Cap height in logical px of a text style (cap height × zoom). */
export function capHeightOf(style: TextStyle): number {
  return baseCapHeight(style.font) * style.zoom;
}

/** Room for a large HUD value: the narrower side panel minus the padding on both sides. */
function largeValueRoom(layout: Layout): number {
  const panels = layout.sidePanels;
  if (panels === undefined) {
    return 0;
  }
  return Math.min(panels[0].width, panels[1].width) - 2 * TUNING.hud.edgePadding;
}

/** The choice doubled when text of `fitWidth` (measured at the choice) still fits `room`, else the choice. */
function doubledIfFits(choice: TextChoice, fitWidth: number | undefined, room: number): TextStyle {
  if (fitWidth === undefined) {
    return choice;
  }
  const doubled = scaledChoice(choice, 2);
  return (fitWidth * doubled.zoom) / choice.zoom <= room ? doubled : choice;
}

/**
 * The text style of a round text role — the only place that picks fonts for round text. HUD roles and
 * popups use `layout.hudText`, hints and the countdown label `layout.menuText`; `fitWidth` is the width
 * of the text measured at the role's base choice: a large HUD value doubles when it then still fits the
 * side panel, a banner doubles when it fits the field minus its padding. The countdown digit is
 * `menuText` × the digit factor (zoom capped at 4).
 */
export function roundTextStyle(layout: Layout, role: RoundTextRole, fitWidth?: number): TextStyle {
  switch (role) {
    case 'hud-label':
    case 'hud-value':
    case 'popup':
      return layout.hudText;
    case 'hud-value-large':
      return doubledIfFits(layout.hudText, fitWidth, largeValueRoom(layout));
    case 'hint':
    case 'countdown-label':
      return layout.menuText;
    case 'banner':
      return doubledIfFits(
        layout.menuText,
        fitWidth,
        layout.field.width - 2 * TUNING.overlay.bannerPadding,
      );
    case 'countdown-digit':
      return scaledChoice(layout.menuText, TUNING.overlay.digitFactor);
  }
}
