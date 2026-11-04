import { notImplemented } from '@r15k/engine';
import type { Point, Rect } from '@r15k/engine';
import type { Widget } from '../widgets/widget-types.ts';

/** The rectangle expanded (centred) to at least minTouchTarget × minTouchTarget. */
export function hitRect(_rect: Rect, _minTouchTarget: number): Rect {
  return notImplemented('ui.hitRect');
}

/** The widget whose hit rect contains the point. */
export function widgetAt(
  _widgets: readonly Widget[],
  _point: Point,
  _minTouchTarget: number,
): Widget | undefined {
  return notImplemented('ui.widgetAt');
}
