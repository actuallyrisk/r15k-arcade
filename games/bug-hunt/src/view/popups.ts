import { clamp } from '@r15k/engine';
import type { DrawTarget, Layout, Point, Translator } from '@r15k/engine';
import { drawLabel, labelWidth, UI_THEME } from '@r15k/ui';
import { TUNING } from '../content/tuning.ts';
import type { Popup } from './round-view-state.ts';
import { roundTextStyle } from './text-styles.ts';

/** Space a popup keeps to the field edges in px (as the original). */
const EDGE = 1;

/** What popups are drawn with; `field` is a target whose origin is the field's top-left corner. */
export interface PopupInput {
  readonly layout: Layout;
  readonly popups: readonly Popup[];
  readonly i18n: Translator;
  /** Top of the cat in field coordinates (without hop). */
  readonly catTop: number;
  readonly offset: Point;
  readonly isReducedMotion: boolean;
}

/**
 * Score popups above the cat: `+n` / `-n` formatted here, rising unless reduced motion, centred on the
 * caught item and kept inside the field, each with a 1 px popup shadow (invisible in dark palettes).
 */
export function drawPopups(field: DrawTarget, input: PopupInput): void {
  const style = roundTextStyle(input.layout, 'popup');
  for (const popup of input.popups) {
    if (popup.ageSeconds < 0) {
      continue;
    }
    const key = popup.kind === 'points' ? 'bugHunt.popup.points' : 'bugHunt.popup.penalty';
    const text = input.i18n.t(key, { value: popup.value });
    const width = labelWidth(text, style);
    const rise = input.isReducedMotion ? 0 : popup.ageSeconds * TUNING.view.popupRisePerSecond;
    const x = clamp(Math.round(popup.x - width / 2), EDGE, input.layout.field.width - width - EDGE);
    drawLabel(field, text, {
      style,
      slot: popup.slot,
      x: x + input.offset.x,
      y: Math.round(input.catTop - TUNING.view.popupOffsetY - rise) + input.offset.y,
      shadowSlot: UI_THEME.popupShadow,
    });
  }
}
