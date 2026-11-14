import { rectContains } from '@r15k/engine';
import type { Point, Rect } from '@r15k/engine';
import type { Widget } from '../widgets/widget-types.ts';

/** One side of a rectangle grown (centred) to at least `minimum`. */
function grow(start: number, length: number, minimum: number): { start: number; length: number } {
  if (length >= minimum) {
    return { start, length };
  }
  return { start: start - Math.floor((minimum - length) / 2), length: minimum };
}

/** The rectangle expanded (centred) to at least minTouchTarget × minTouchTarget. */
export function hitRect(rect: Rect, minTouchTarget: number): Rect {
  const horizontal = grow(rect.x, rect.width, minTouchTarget);
  const vertical = grow(rect.y, rect.height, minTouchTarget);
  return {
    x: horizontal.start,
    y: vertical.start,
    width: horizontal.length,
    height: vertical.length,
  };
}

/** Squared distance from a point to the centre of a rectangle. */
function centreDistance(rect: Rect, point: Point): number {
  const dx = rect.x + rect.width / 2 - point.x;
  const dy = rect.y + rect.height / 2 - point.y;
  return dx * dx + dy * dy;
}

/**
 * The widget whose hit rect contains the point. Where widened hit rects overlap, a widget whose drawn
 * rect contains the point wins, then the one whose centre is nearest (the first on a tie).
 */
export function widgetAt(
  widgets: readonly Widget[],
  point: Point,
  minTouchTarget: number,
): Widget | undefined {
  const hits = widgets.filter((widget) =>
    rectContains(hitRect(widget.rect, minTouchTarget), point),
  );
  const direct = hits.find((widget) => rectContains(widget.rect, point));
  if (direct !== undefined) {
    return direct;
  }
  let best: Widget | undefined;
  for (const widget of hits) {
    if (
      best === undefined ||
      centreDistance(widget.rect, point) < centreDistance(best.rect, point)
    ) {
      best = widget;
    }
  }
  return best;
}
