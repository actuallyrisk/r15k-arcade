import { expandRect, strokeRect } from '@r15k/engine';
import type { DrawTarget, Rect } from '@r15k/engine';
import { UI_THEME } from '../theme/ui-theme.ts';

/**
 * A 1 px focusGap ring at distance 1 and a 1 px focusRing ring at distance 2 outside the rectangle, so
 * the ring stays visible on any fill.
 */
export function drawFocusRing(target: DrawTarget, rect: Rect): void {
  strokeRect(target, expandRect(rect, 1), UI_THEME.focusGap);
  strokeRect(target, expandRect(rect, 2), UI_THEME.focusRing);
}
