import type { Point, Rect } from '../math/geometry.ts';
import { floorSafe } from './device-math.ts';
import type { LayoutResult } from './layout-types.ts';

/** Converts a CSS point to logical canvas px (floored); `undefined` outside the canvas. */
export function cssToLogical(layout: LayoutResult, cssPoint: Point): Point | undefined {
  const { canvasCss, cssPerLogical, logical } = layout;
  // Tolerant floor: a point on a logical pixel boundary must not land one pixel short through
  // floating-point noise in the CSS ↔ device conversion.
  const x = floorSafe((cssPoint.x - canvasCss.x) / cssPerLogical);
  const y = floorSafe((cssPoint.y - canvasCss.y) / cssPerLogical);
  const isInside = x >= 0 && y >= 0 && x < logical.width && y < logical.height;
  return isInside ? { x, y } : undefined;
}

/** Converts a logical rectangle to CSS px (for the accessibility mirror). */
export function logicalToCss(layout: LayoutResult, rect: Rect): Rect {
  const { canvasCss, cssPerLogical } = layout;
  return {
    x: canvasCss.x + rect.x * cssPerLogical,
    y: canvasCss.y + rect.y * cssPerLogical,
    width: rect.width * cssPerLogical,
    height: rect.height * cssPerLogical,
  };
}
