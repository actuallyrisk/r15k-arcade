import { fillRect, rectBottom, rectRight } from '@r15k/engine';
import type { DrawTarget, InputDevice, Layout, Rect, SlotIndex, Translator } from '@r15k/engine';
import { drawLabel, drawPanel, labelWidth, UI_THEME, wrapLabel } from '@r15k/ui';
import type { TextStyle } from '@r15k/ui';
import { TUNING } from '../content/tuning.ts';
import { secondsLeft } from '../sim/countdown.ts';
import { ROUND_TICKS } from '../sim/derived.ts';
import type { BugHuntState } from '../sim/state.ts';
import { comboPipsFilled, drawPips, pipsWidth } from './combo-pips.ts';
import { roundPanelRect } from './hud-placement.ts';
import type { HudPlacement } from './hud-placement.ts';
import { capHeightOf, roundTextStyle } from './text-styles.ts';

/** What the HUD shows. */
export interface HudInput {
  readonly layout: Layout;
  readonly placement: HudPlacement;
  readonly state: BugHuntState;
  readonly bestScore: number;
  readonly i18n: Translator;
  readonly lastDevice: InputDevice;
}

/** The HUD texts of a state. */
interface HudTexts {
  readonly scoreLabel: string;
  readonly score: string;
  readonly timeLabel: string;
  readonly time: string;
  readonly bestLabel: string;
  readonly best: string;
  readonly comboLabel: string;
  readonly multiplier: string;
  readonly isWarning: boolean;
}

const PAD = TUNING.hud.edgePadding;

/** Texts of the HUD; only the score uses grouped digits. */
function hudTexts(input: HudInput): HudTexts {
  const { state, i18n } = input;
  const left = secondsLeft(state);
  return {
    scoreLabel: i18n.t('bugHunt.hud.score'),
    score: i18n.formatInteger(state.score),
    timeLabel: i18n.t('bugHunt.hud.time'),
    time: String(left),
    bestLabel: i18n.t('bugHunt.hud.best'),
    best: String(Math.max(input.bestScore, state.score)),
    comboLabel: i18n.t('bugHunt.hud.combo'),
    multiplier: i18n.t('bugHunt.hud.multiplier', { value: state.multiplier }),
    isWarning: state.phase === 'playing' && left <= TUNING.timeWarningSeconds,
  };
}

/** The 1 px time bar: width ∝ time left in accent, dashed in the warning colour during the warning. */
function drawTimeBar(
  target: DrawTarget,
  bar: Rect,
  input: { readonly state: BugHuntState; readonly isWarning: boolean },
): void {
  const fraction = Math.max(0, ROUND_TICKS - input.state.playTicks) / ROUND_TICKS;
  const width = Math.round(bar.width * fraction);
  if (!input.isWarning) {
    fillRect(target, { ...bar, width }, UI_THEME.accent);
    return;
  }
  const dash = TUNING.hud.warningDash;
  for (let x = 0; x < width; x += 2 * dash) {
    fillRect(
      target,
      { ...bar, x: bar.x + x, width: Math.min(dash, width - x) },
      UI_THEME.textWarning,
    );
  }
}

/** Score left, time centred and best right on the ink band (time in the warning colour when it runs out). */
function drawBand(target: DrawTarget, input: HudInput, texts: HudTexts): void {
  const { layout, placement } = input;
  const band = layout.hudBand;
  if (band === undefined) {
    return;
  }
  const style = roundTextStyle(layout, 'hud-value');
  fillRect(target, band, UI_THEME.hudFill);
  const line = { style, slot: UI_THEME.hudText, y: placement.score.y };
  drawLabel(target, `${texts.scoreLabel} ${texts.score}`, { ...line, x: placement.score.x });
  drawLabel(target, `${texts.timeLabel} ${texts.time}`, {
    ...line,
    slot: texts.isWarning ? UI_THEME.textWarning : UI_THEME.hudText,
    x: placement.time.x + Math.floor(placement.time.width / 2),
    align: 'center',
  });
  drawLabel(target, `${texts.bestLabel} ${texts.best}`, {
    ...line,
    x: rectRight(placement.best),
    align: 'right',
  });
  if (layout.arrangement === 'banded') {
    drawLabel(target, texts.multiplier, { ...line, x: placement.combo.x });
  }
  if (placement.timeBar !== undefined) {
    drawTimeBar(target, placement.timeBar, { state: input.state, isWarning: texts.isWarning });
  }
}

/** `COMBO ×n` and the pips towards the next stage on one line at the top left of a panel. */
function drawPanelCombo(target: DrawTarget, input: HudInput, texts: HudTexts): void {
  const { layout, placement } = input;
  const style = roundTextStyle(layout, 'hud-label');
  const text = `${texts.comboLabel} ${texts.multiplier}`;
  const width = drawLabel(target, text, {
    style,
    slot: UI_THEME.text,
    x: placement.combo.x,
    y: placement.combo.y,
  });
  drawPips(target, {
    x: placement.combo.x + width + PAD,
    y: placement.combo.y,
    size: capHeightOf(style),
    filled: comboPipsFilled(input.state.streak),
  });
}

/** A label/value pair centred in a side panel column; the value may be a warning badge. */
function drawSideValue(
  target: DrawTarget,
  rect: Rect,
  entry: {
    readonly label: string;
    readonly value: string;
    readonly valueStyle: TextStyle;
    readonly isWarning: boolean;
    readonly labelStyle: TextStyle;
  },
): void {
  const centre = rect.x + Math.floor(rect.width / 2);
  drawLabel(target, entry.label, {
    style: entry.labelStyle,
    slot: UI_THEME.text,
    x: centre,
    y: rect.y,
    align: 'center',
  });
  const y = rect.y + capHeightOf(entry.labelStyle) + PAD;
  let slot: SlotIndex = UI_THEME.text;
  if (entry.isWarning) {
    const width = labelWidth(entry.value, entry.valueStyle);
    const cap = capHeightOf(entry.valueStyle);
    const badge = {
      x: centre - Math.ceil(width / 2) - 1,
      y: y - 1,
      width: width + 2,
      height: cap + 2,
    };
    fillRect(target, badge, UI_THEME.hudFill);
    slot = UI_THEME.textWarning;
  }
  drawLabel(target, entry.value, { style: entry.valueStyle, slot, x: centre, y, align: 'center' });
}

/** sides: score (large when it fits) and combo left, time and best right, ink on grid paper. */
function drawSides(target: DrawTarget, input: HudInput, texts: HudTexts): void {
  const { layout, placement } = input;
  const label = roundTextStyle(layout, 'hud-label');
  const value = roundTextStyle(layout, 'hud-value');
  const base = { labelStyle: label, valueStyle: value, isWarning: false };
  const large = roundTextStyle(layout, 'hud-value-large', labelWidth(texts.score, value));
  drawSideValue(target, placement.score, {
    ...base,
    label: texts.scoreLabel,
    value: texts.score,
    valueStyle: large,
  });
  drawSideValue(target, placement.time, {
    ...base,
    label: texts.timeLabel,
    value: texts.time,
    isWarning: texts.isWarning,
  });
  drawSideValue(target, placement.best, { ...base, label: texts.bestLabel, value: texts.best });
  drawSideValue(target, placement.combo, {
    ...base,
    label: texts.comboLabel,
    value: texts.multiplier,
  });
  const cap = capHeightOf(label);
  const pipsY = placement.combo.y + 2 * (cap + PAD);
  const centre = placement.combo.x + Math.floor(placement.combo.width / 2);
  drawPips(target, {
    x: centre - Math.floor(pipsWidth(cap) / 2),
    y: pipsY,
    size: cap,
    filled: comboPipsFilled(input.state.streak),
  });
}

/** The wrapped drag hint centred in its area (touch only). */
function drawDragHint(target: DrawTarget, input: HudInput): void {
  const area = input.placement.dragHint;
  if (area === undefined || input.lastDevice !== 'touch') {
    return;
  }
  const style = roundTextStyle(input.layout, 'hint');
  const cap = capHeightOf(style);
  const lines = wrapLabel(input.i18n.t('bugHunt.hint.drag'), { style, maxWidth: area.width });
  const advance = cap + Math.ceil(cap / 2);
  const height = lines.length * advance - (advance - cap);
  const top = area.y + Math.max(0, Math.floor((area.height - height) / 2));
  const centre = area.x + Math.floor(area.width / 2);
  lines.forEach((line, index) => {
    const y = top + index * advance;
    if (y + cap <= rectBottom(area)) {
      drawLabel(target, line, { style, slot: UI_THEME.textMuted, x: centre, y, align: 'center' });
    }
  });
}

/** The HUD of the arrangement: the band or the side panels, and the paper panel with combo and hint. */
export function drawRoundHud(target: DrawTarget, input: HudInput): void {
  const texts = hudTexts(input);
  const panel = roundPanelRect(input.layout);
  if (panel !== undefined) {
    drawPanel(target, panel);
    drawPanelCombo(target, input, texts);
    drawDragHint(target, input);
  }
  if (input.placement.isOnInk) {
    drawBand(target, input, texts);
  } else {
    drawSides(target, input, texts);
  }
}
