import { notImplemented } from '@r15k/engine';
import type { DrawTarget, Point, Rect } from '@r15k/engine';

/**
 * Grid paper like the site background: paper fill and grid lines where (x − origin.x) % spacing ===
 * spacing − 1 (same for y); default spacing 16, origin (0, 0).
 */
export function drawGridPaper(
  _target: DrawTarget,
  _rect: Rect,
  _options?: { readonly spacing?: number; readonly origin?: Point },
): void {
  return notImplemented('ui.drawGridPaper');
}
