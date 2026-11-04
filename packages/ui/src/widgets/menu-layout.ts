import { notImplemented } from '@r15k/engine';
import type { Rect, TextChoice } from '@r15k/engine';

/** Row height: max(lines × (capHeight · zoom + 4) + 4, minTouchTarget). */
export function rowHeightFor(_choice: TextChoice, _minTouchTarget: number, _lines: 1 | 2): number {
  return notImplemented('ui.rowHeightFor');
}

/** Rects and scroll state of a menu column. */
export interface MenuColumnLayout {
  readonly rects: readonly Rect[];
  readonly visible: readonly boolean[];
  readonly scrollOffset: number;
  readonly hasMoreAbove: boolean;
  readonly hasMoreBelow: boolean;
  readonly moreAbove: Rect | undefined;
  readonly moreBelow: Rect | undefined;
}

/**
 * Lays out a scrolling column so the focused row is fully visible; rows outside the region keep their
 * height but sit at the nearest region edge (not visible), ↑/↓ indicators take a strip of
 * minTouchTarget height when needed.
 */
export function layoutMenuColumn(_options: {
  readonly region: Rect;
  readonly rowHeights: readonly number[];
  readonly rowGap: number;
  readonly focusIndex: number;
  readonly scrollOffset: number;
  readonly minTouchTarget: number;
}): MenuColumnLayout {
  return notImplemented('ui.layoutMenuColumn');
}
