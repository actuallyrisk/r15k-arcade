import { SLOT } from '@r15k/engine';
import type { DrawTarget, Layout, Translator } from '@r15k/engine';
import { drawLabel, labelWidth, UI_THEME } from '@r15k/ui';
import { TUNING } from '../content/tuning.ts';
import { DIGIT_PERIOD_TICKS } from '../sim/derived.ts';
import type { BugHuntState } from '../sim/state.ts';
import type { Banner } from './round-view-state.ts';
import { roundTextStyle } from './text-styles.ts';

/** Seconds one digit of the resume countdown stays. */
const RESUME_DIGIT_SECONDS = TUNING.resumeCountdownSeconds / TUNING.countdown.digits;

/** The digit of the round countdown shown in a state (3, 2, 1). */
export function countdownDigit(state: BugHuntState): number {
  return Math.max(1, Math.ceil(state.countdownTicks / DIGIT_PERIOD_TICKS));
}

/** The digit of the resume countdown for the seconds left (3, 2, 1; 0 when it is over). */
export function resumeDigit(resumeSeconds: number): number {
  return resumeSeconds <= 0 ? 0 : Math.ceil(resumeSeconds / RESUME_DIGIT_SECONDS);
}

/**
 * "READY?" in the accent colour above a large digit with a blue shadow, both centred on the field; the
 * offsets grow with the label zoom so the two never overlap.
 */
export function drawCountdown(
  target: DrawTarget,
  layout: Layout,
  input: { readonly digit: number; readonly i18n: Translator },
): void {
  const { field } = layout;
  const centreX = field.x + Math.floor(field.width / 2);
  const middleY = field.y + Math.floor(field.height / 2);
  const labelStyle = roundTextStyle(layout, 'countdown-label');
  drawLabel(target, input.i18n.t('bugHunt.countdown.ready'), {
    style: labelStyle,
    slot: UI_THEME.textAccent,
    x: centreX,
    y: middleY + TUNING.overlay.readyOffsetY * labelStyle.zoom,
    align: 'center',
  });
  drawLabel(target, String(input.digit), {
    style: roundTextStyle(layout, 'countdown-digit'),
    slot: UI_THEME.text,
    x: centreX,
    y: middleY + TUNING.overlay.digitOffsetY * labelStyle.zoom,
    align: 'center',
    shadowSlot: SLOT.blue,
  });
}

/** "GO!" in the accent colour or "FRIDAY DEPLOY!" in pink with an ink shadow, large when it fits. */
export function drawBanner(
  target: DrawTarget,
  layout: Layout,
  input: { readonly banner: Banner; readonly i18n: Translator },
): void {
  const { field } = layout;
  const text = input.i18n.t(input.banner.key);
  const isBomb = input.banner.key === 'bugHunt.banner.fridayDeploy';
  drawLabel(target, text, {
    style: roundTextStyle(layout, 'banner', labelWidth(text, layout.menuText)),
    slot: isBomb ? SLOT.pink : UI_THEME.textAccent,
    x: field.x + Math.floor(field.width / 2),
    y: field.y + Math.floor(field.height * TUNING.overlay.bannerYFraction),
    align: 'center',
    ...(isBomb ? { shadowSlot: SLOT.ink } : {}),
  });
}
