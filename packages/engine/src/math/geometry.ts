import { notImplemented } from '../util/assert.ts';

/** A point in pixel coordinates. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A width and a height. */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** An axis-aligned rectangle; its right and bottom edges are exclusive. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Distances from the four edges of a rectangle. */
export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** Insets of zero on every side. */
export const ZERO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Exclusive right edge (`x + width`). */
export function rectRight(_rect: Rect): number {
  return notImplemented('engine.rectRight');
}

/** Exclusive bottom edge (`y + height`). */
export function rectBottom(_rect: Rect): number {
  return notImplemented('engine.rectBottom');
}

/** Whether the point lies inside the half-open rectangle `[x, x + width) × [y, y + height)`. */
export function rectContains(_rect: Rect, _point: Point): boolean {
  return notImplemented('engine.rectContains');
}

/** Whether two rectangles overlap. */
export function rectsIntersect(_a: Rect, _b: Rect): boolean {
  return notImplemented('engine.rectsIntersect');
}

/** Intersection of two rectangles; width and height are clamped to at least 0. */
export function intersectRects(_a: Rect, _b: Rect): Rect {
  return notImplemented('engine.intersectRects');
}

/** Shrinks a rectangle by the given insets. */
export function insetRect(_rect: Rect, _insets: Insets): Rect {
  return notImplemented('engine.insetRect');
}

/** Grows a rectangle by `amount` on all sides. */
export function expandRect(_rect: Rect, _amount: number): Rect {
  return notImplemented('engine.expandRect');
}

/** Places a rectangle of `size` in the middle of `outer`, floored to integers. */
export function centerRect(_outer: Rect, _size: Size): Rect {
  return notImplemented('engine.centerRect');
}

/** Moves a rectangle by an offset. */
export function translateRect(_rect: Rect, _offset: Point): Rect {
  return notImplemented('engine.translateRect');
}
