// Integer pixel geometry. Only exactly specified operations, so deterministic simulations may use the
// containment and intersection tests.

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
export function rectRight(rect: Rect): number {
  return rect.x + rect.width;
}

/** Exclusive bottom edge (`y + height`). */
export function rectBottom(rect: Rect): number {
  return rect.y + rect.height;
}

/** Whether the point lies inside the half-open rectangle `[x, x + width) × [y, y + height)`. */
export function rectContains(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x < rectRight(rect) &&
    point.y >= rect.y &&
    point.y < rectBottom(rect)
  );
}

/** Whether two rectangles share at least one pixel (empty rectangles intersect nothing). */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    Math.max(a.x, b.x) < Math.min(rectRight(a), rectRight(b)) &&
    Math.max(a.y, b.y) < Math.min(rectBottom(a), rectBottom(b))
  );
}

/** Intersection of two rectangles; width and height are clamped to at least 0. */
export function intersectRects(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(0, Math.min(rectRight(a), rectRight(b)) - x),
    height: Math.max(0, Math.min(rectBottom(a), rectBottom(b)) - y),
  };
}

/** Shrinks a rectangle by the given insets; width and height are clamped to at least 0. */
export function insetRect(rect: Rect, insets: Insets): Rect {
  return {
    x: rect.x + insets.left,
    y: rect.y + insets.top,
    width: Math.max(0, rect.width - insets.left - insets.right),
    height: Math.max(0, rect.height - insets.top - insets.bottom),
  };
}

/** Grows a rectangle by `amount` on all sides (negative shrinks; size clamped to at least 0). */
export function expandRect(rect: Rect, amount: number): Rect {
  return insetRect(rect, { top: -amount, right: -amount, bottom: -amount, left: -amount });
}

/** Places a rectangle of `size` in the middle of `outer`, floored to integers. */
export function centerRect(outer: Rect, size: Size): Rect {
  return {
    x: Math.floor(outer.x + (outer.width - size.width) / 2),
    y: Math.floor(outer.y + (outer.height - size.height) / 2),
    width: size.width,
    height: size.height,
  };
}

/** Moves a rectangle by an offset. */
export function translateRect(rect: Rect, offset: Point): Rect {
  return { x: rect.x + offset.x, y: rect.y + offset.y, width: rect.width, height: rect.height };
}
