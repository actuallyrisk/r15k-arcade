import type { Point, Rect } from '../math/geometry.ts';
import { notImplemented } from '../util/assert.ts';
import type { LayoutResult } from './layout-types.ts';

/** Converts a CSS point to logical canvas px; `undefined` outside the canvas. */
export function cssToLogical(_layout: LayoutResult, _cssPoint: Point): Point | undefined {
  return notImplemented('engine.cssToLogical');
}

/** Converts a logical rectangle to CSS px (for the accessibility mirror). */
export function logicalToCss(_layout: LayoutResult, _rect: Rect): Rect {
  return notImplemented('engine.logicalToCss');
}
