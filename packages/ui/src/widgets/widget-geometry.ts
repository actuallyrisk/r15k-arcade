import type { Rect, Size, TextChoice } from '@r15k/engine';
import { hitRect } from '../focus/pointer-hit.ts';
import { labelWidth } from '../draw/label.ts';
import { boxSize, letterBoxes, widgetSizeFor } from './initials-layout.ts';
import { drawnRow, layoutRow, trackOf } from './row-layout.ts';
import type { InitialsWidget, SelectorWidget, SliderWidget, Widget } from './widget-types.ts';

/** Where the label and the value of a row go. */
export interface WidgetLines {
  readonly isTwoLine: boolean;
  readonly label: Rect;
  readonly value: Rect;
}

/**
 * One line when label + gap + widest value (every selector option, both on/off texts, the slider with
 * its widest value text) fits the row width, else the label on the first line and the value line
 * right-aligned below (row height = 2 × line height, see rowHeightFor). The draw functions lay a row out
 * on two lines only when it does not fit with one space between label and value, so scenes pass a gap
 * of at least one space (spaceWidth × zoom).
 */
export function rowLines(
  widget: Widget,
  options: { readonly text: TextChoice; readonly gap: number },
): WidgetLines {
  const row = layoutRow(widget, { style: options.text, gap: options.gap });
  return { isTwoLine: row.isTwoLine, label: row.label, value: row.value };
}

/** The drawn slider track; its hit area is the track expanded vertically to ≥ minTouchTarget. */
export function sliderTrackRect(
  widget: SliderWidget,
  options: { readonly text: TextChoice; readonly minTouchTarget: number },
): Rect {
  return trackOf(widget, { row: drawnRow(widget, options.text), style: options.text });
}

/** The ← and → glyph areas of a selector, each widened (centred) to ≥ minTouchTarget. */
export function selectorArrowRects(
  widget: SelectorWidget,
  options: { readonly text: TextChoice; readonly minTouchTarget: number },
): { readonly previous: Rect; readonly next: Rect } {
  const { value } = drawnRow(widget, options.text);
  const previousWidth = labelWidth('←', options.text);
  const nextWidth = labelWidth('→', options.text);
  const previous = { x: value.x, y: value.y, width: previousWidth, height: value.height };
  const next = {
    x: value.x + value.width - nextWidth,
    y: value.y,
    width: nextWidth,
    height: value.height,
  };
  return {
    previous: hitRect(previous, options.minTouchTarget),
    next: hitRect(next, options.minTouchTarget),
  };
}

/** Touch areas of one initials box: up = upper half (letter −1), down = lower half (+1). */
export interface InitialsHitArea {
  readonly index: number;
  readonly box: Rect;
  readonly up: Rect;
  readonly down: Rect;
}

/** A box widened (centred) to at least minTouchTarget × 2 · minTouchTarget. */
function touchBox(box: Rect, minTouchTarget: number): Rect {
  const width = Math.max(box.width, minTouchTarget);
  const height = Math.max(box.height, 2 * minTouchTarget);
  return {
    x: box.x - Math.floor((width - box.width) / 2),
    y: box.y - Math.floor((height - box.height) / 2),
    width,
    height,
  };
}

/** Hit areas of the three boxes: width ≥ minTouchTarget, height ≥ 2 × minTouchTarget. */
export function initialsHitAreas(
  widget: InitialsWidget,
  minTouchTarget: number,
): readonly InitialsHitArea[] {
  return letterBoxes(widget.rect).map((drawn, index) => {
    const box = touchBox(drawn, minTouchTarget);
    const upHeight = Math.floor(box.height / 2);
    return {
      index,
      box,
      up: { x: box.x, y: box.y, width: box.width, height: upHeight },
      down: { x: box.x, y: box.y + upHeight, width: box.width, height: box.height - upHeight },
    };
  });
}

/** The widget rect needed for three boxes and their gaps (boxes ≥ minTouchTarget × 2 · minTouchTarget). */
export function initialsSize(minTouchTarget: number, text: TextChoice): Size {
  return widgetSizeFor(boxSize(minTouchTarget, text));
}
