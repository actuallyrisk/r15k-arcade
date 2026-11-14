import { drawHLine, drawVLine, fillRect } from '@r15k/engine';
import type { DrawTarget, Point, Rect } from '@r15k/engine';
import { UI_THEME } from '../theme/ui-theme.ts';

const GRID_SPACING = 16;

/** Whether `value` lies on a grid line: (value − origin) mod spacing === spacing − 1. */
function isOnLine(value: number, origin: number, spacing: number): boolean {
  const offset = (((value - origin) % spacing) + spacing) % spacing;
  return offset === spacing - 1;
}

/**
 * Grid paper like the site background: paper fill and 1 px grid lines where
 * (x − origin.x) % spacing === spacing − 1 (same for y); default spacing 16, origin (0, 0).
 */
export function drawGridPaper(
  target: DrawTarget,
  rect: Rect,
  options?: { readonly spacing?: number; readonly origin?: Point },
): void {
  const spacing = Math.max(1, Math.floor(options?.spacing ?? GRID_SPACING));
  const origin = options?.origin ?? { x: 0, y: 0 };
  const area = {
    x: Math.floor(rect.x),
    y: Math.floor(rect.y),
    width: Math.floor(rect.width),
    height: Math.floor(rect.height),
  };
  fillRect(target, area, UI_THEME.panelFill);
  const slot = UI_THEME.gridLine;
  for (let x = area.x; x < area.x + area.width; x += 1) {
    if (isOnLine(x, origin.x, spacing)) {
      drawVLine(target, { x, y: area.y, length: area.height, slot });
    }
  }
  for (let y = area.y; y < area.y + area.height; y += 1) {
    if (isOnLine(y, origin.y, spacing)) {
      drawHLine(target, { x: area.x, y, length: area.width, slot });
    }
  }
}
