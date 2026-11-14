import type { Rect } from '@r15k/engine';
import { labelWidth } from '../draw/label.ts';
import { capHeightOf, spaceWidthOf } from '../text/text-metrics.ts';
import type { TextStyle } from '../text/ui-fonts.ts';
import type { SelectorWidget, SliderWidget, ToggleWidget, Widget } from './widget-types.ts';

// Shared geometry of the row widgets (toggle, slider, selector): what the draw functions, the hit
// areas and rowLines agree on. A row is "label left, value right" on one line, or the label on the
// first line and the value right-aligned on a second line. A slider's track grows from its minimum
// length up to a preferred length when the row has room, so the tracks of a settings column line up.

/** Hard shadow of buttons and boxes, right and down, in logical px. */
export const CONTROL_SHADOW = 2;
/** Height of the slider track (1 px border, 1 px fill, 1 px border). */
export const TRACK_HEIGHT = 3;
/** Width of the slider thumb. */
export const THUMB_WIDTH = 3;
/** Shortest slider track in cap heights (what decides one or two lines). */
const TRACK_MIN_CAPS = 4;
/** Longest slider track in cap heights (used when the row has room). */
const TRACK_PREFERRED_CAPS = 10;
/** Vertical padding above and below the cap height inside one row line. */
const LINE_PADDING = 2;

/** Sizes derived from a text style. */
export interface ControlMetrics {
  readonly capHeight: number;
  /** One row line: cap height plus 2 px above and below. */
  readonly lineHeight: number;
  /** Gap inside a value (between arrows and value, track and value text). */
  readonly innerGap: number;
  /** Horizontal padding of text inside a box. */
  readonly boxPadding: number;
  readonly minTrackWidth: number;
  readonly preferredTrackWidth: number;
}

/** The control sizes of a text style. */
export function controlMetrics(style: TextStyle): ControlMetrics {
  const capHeight = capHeightOf(style);
  return {
    capHeight,
    lineHeight: capHeight + 2 * LINE_PADDING,
    innerGap: spaceWidthOf(style),
    boxPadding: 4 * style.zoom,
    minTrackWidth: TRACK_MIN_CAPS * capHeight,
    preferredTrackWidth: TRACK_PREFERRED_CAPS * capHeight,
  };
}

/** Width of the on/off box including its shadow. */
function toggleValueWidth(widget: ToggleWidget, style: TextStyle): number {
  const text = Math.max(labelWidth(widget.onText, style), labelWidth(widget.offText, style));
  return text + 2 * controlMetrics(style).boxPadding + CONTROL_SHADOW;
}

/** Width reserved for a slider's value text: every digit run counts as at least three digits. */
export function sliderTextWidth(widget: SliderWidget, style: TextStyle): number {
  const widest = widget.valueText.replace(/\d+/g, (digits) =>
    '0'.repeat(Math.max(3, digits.length)),
  );
  return Math.max(labelWidth(widget.valueText, style), labelWidth(widest, style));
}

/** Width of a slider value (track + gap + value text) for a track length. */
function sliderValueWidth(widget: SliderWidget, style: TextStyle, track: number): number {
  return track + controlMetrics(style).innerGap + sliderTextWidth(widget, style);
}

/** Width of the widest option label of a selector. */
export function widestOption(widget: SelectorWidget, style: TextStyle): number {
  return Math.max(0, ...widget.options.map((option) => labelWidth(option.label, style)));
}

/** Width of `← widest option →`. */
function selectorValueWidth(widget: SelectorWidget, style: TextStyle): number {
  const metrics = controlMetrics(style);
  const arrows = labelWidth('←', style) + labelWidth('→', style);
  return arrows + 2 * metrics.innerGap + widestOption(widget, style);
}

/** Smallest width of the value part of a row (0 for buttons and initials). */
export function valueWidth(widget: Widget, style: TextStyle): number {
  switch (widget.kind) {
    case 'toggle':
      return toggleValueWidth(widget, style);
    case 'slider':
      return sliderValueWidth(widget, style, controlMetrics(style).minTrackWidth);
    case 'selector':
      return selectorValueWidth(widget, style);
    case 'button':
    case 'initials':
      return 0;
  }
}

/** Where the label and value of a row go; `labelY`/`valueY` are the cap lines of their text. */
export interface RowLayout {
  readonly isTwoLine: boolean;
  readonly label: Rect;
  readonly value: Rect;
  readonly labelY: number;
  readonly valueY: number;
}

/** The drawn value width: a slider grows towards its preferred track into the free room. */
function grownValueWidth(
  widget: Widget,
  style: TextStyle,
  room: { readonly free: number; readonly minimum: number },
): number {
  if (widget.kind !== 'slider') {
    return room.minimum;
  }
  const preferred = sliderValueWidth(widget, style, controlMetrics(style).preferredTrackWidth);
  return Math.max(room.minimum, Math.min(preferred, room.free));
}

/** Lays a row out on one line when label + gap + value fit its width, else on two lines. */
export function layoutRow(
  widget: Widget,
  options: { readonly style: TextStyle; readonly gap: number },
): RowLayout {
  const { style, gap } = options;
  const { rect } = widget;
  const metrics = controlMetrics(style);
  const labelW = Math.min(rect.width, labelWidth(widget.label, style));
  const minimum = valueWidth(widget, style);
  const isTwoLine = minimum > 0 && labelW + gap + minimum > rect.width;
  const free = isTwoLine ? rect.width : rect.width - labelW - gap;
  const valueW = grownValueWidth(widget, style, { free, minimum });
  const lines = isTwoLine ? 2 : 1;
  const top = rect.y + Math.floor((rect.height - lines * metrics.lineHeight) / 2);
  const valueTop = top + (lines - 1) * metrics.lineHeight;
  return {
    isTwoLine,
    label: { x: rect.x, y: top, width: labelW, height: metrics.lineHeight },
    value: {
      x: rect.x + rect.width - valueW,
      y: valueTop,
      width: valueW,
      height: metrics.lineHeight,
    },
    labelY: top + LINE_PADDING,
    valueY: valueTop + LINE_PADDING,
  };
}

/** The row layout the draw functions and hit areas use: two lines only when one space does not fit. */
export function drawnRow(widget: Widget, style: TextStyle): RowLayout {
  return layoutRow(widget, { style, gap: spaceWidthOf(style) });
}

/** The drawn slider track of a row layout: the value part minus the gap and the value text. */
export function trackOf(
  widget: SliderWidget,
  context: { readonly row: RowLayout; readonly style: TextStyle },
): Rect {
  const { row, style } = context;
  const width = row.value.width - controlMetrics(style).innerGap - sliderTextWidth(widget, style);
  return {
    x: row.value.x,
    y: row.value.y + Math.floor((row.value.height - TRACK_HEIGHT) / 2),
    width: Math.max(THUMB_WIDTH, width),
    height: TRACK_HEIGHT,
  };
}
