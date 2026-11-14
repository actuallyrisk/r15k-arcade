import { clamp } from '@r15k/engine';
import type { Rect } from '@r15k/engine';
import { THUMB_WIDTH } from './row-layout.ts';
import type { SliderWidget } from './widget-types.ts';

/** Removes binary floating-point noise from a stepped value (e.g. 0.30000000000000004 → 0.3). */
function tidy(value: number): number {
  return Math.round(value * 1e9) / 1e9;
}

/** A value snapped to the slider's steps and clamped to its range. */
export function steppedValue(widget: SliderWidget, value: number): number {
  const { min, max, step } = widget;
  const snapped = step > 0 ? min + Math.round((value - min) / step) * step : value;
  return tidy(clamp(snapped, Math.min(min, max), Math.max(min, max)));
}

/** Position of the value between min and max, 0…1 (0 for an empty range). */
function fraction(widget: SliderWidget): number {
  const span = widget.max - widget.min;
  return span === 0 ? 0 : clamp((widget.value - widget.min) / span, 0, 1);
}

/** Left edge of the thumb on a track. */
export function thumbX(widget: SliderWidget, track: Rect): number {
  return track.x + Math.round(fraction(widget) * (track.width - THUMB_WIDTH));
}

/** The stepped value for a pointer at `x` along a track (the thumb centre follows the pointer). */
export function valueAtX(widget: SliderWidget, track: Rect, x: number): number {
  const travel = Math.max(1, track.width - THUMB_WIDTH);
  const position = clamp((x - track.x - Math.floor(THUMB_WIDTH / 2)) / travel, 0, 1);
  return steppedValue(widget, widget.min + position * (widget.max - widget.min));
}
