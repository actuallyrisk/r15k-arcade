import { notImplemented } from '@r15k/engine';
import type { Rect, Size, TextChoice } from '@r15k/engine';
import type { InitialsWidget, SelectorWidget, SliderWidget, Widget } from './widget-types.ts';

/** Where the label and the value of a row go. */
export interface WidgetLines {
  readonly isTwoLine: boolean;
  readonly label: Rect;
  readonly value: Rect;
}

/**
 * One line when label + gap + widest value fits the row width, else the label on the first line and
 * the value line below (row height = 2 × line height).
 */
export function rowLines(
  _widget: Widget,
  _options: { readonly text: TextChoice; readonly gap: number },
): WidgetLines {
  return notImplemented('ui.rowLines');
}

/** The drawn slider track; its hit area is the track expanded vertically to ≥ minTouchTarget. */
export function sliderTrackRect(
  _widget: SliderWidget,
  _options: { readonly text: TextChoice; readonly minTouchTarget: number },
): Rect {
  return notImplemented('ui.sliderTrackRect');
}

/** The ← and → glyph areas of a selector, each widened to ≥ minTouchTarget. */
export function selectorArrowRects(
  _widget: SelectorWidget,
  _options: { readonly text: TextChoice; readonly minTouchTarget: number },
): { readonly previous: Rect; readonly next: Rect } {
  return notImplemented('ui.selectorArrowRects');
}

/** Touch areas of one initials box: up = upper half (letter −1), down = lower half (+1). */
export interface InitialsHitArea {
  readonly index: number;
  readonly box: Rect;
  readonly up: Rect;
  readonly down: Rect;
}

/** Hit areas of the three boxes: width ≥ minTouchTarget, height ≥ 2 × minTouchTarget. */
export function initialsHitAreas(
  _widget: InitialsWidget,
  _minTouchTarget: number,
): readonly InitialsHitArea[] {
  return notImplemented('ui.initialsHitAreas');
}

/** The widget rect needed for three boxes and their gaps. */
export function initialsSize(_minTouchTarget: number, _text: TextChoice): Size {
  return notImplemented('ui.initialsSize');
}
