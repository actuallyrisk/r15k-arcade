import { rectBottom, rectContains, rectsIntersect } from '@r15k/engine';
import type { Point, Rect } from '@r15k/engine';
import { initialsHitAreas, sliderTrackRect } from '../widgets/widget-geometry.ts';
import type { SliderWidget, Widget } from '../widgets/widget-types.ts';
import type { MenuInput } from './menu-reducer.ts';
import { hitRect, widgetAt } from './pointer-hit.ts';

// Hit testing of a menu: the more-indicators, widgets that are not scrolled out of view, slider tracks
// and the initials boxes.

/** Press id of the ↑ more-indicator. */
export const MORE_ABOVE_ID = '\u0000more-above';
/** Press id of the ↓ more-indicator. */
export const MORE_BELOW_ID = '\u0000more-below';
/** Press id of a press on empty space inside the scroll region. */
export const BACKGROUND_ID = '\u0000background';

/** The part of the scroll region between the more-indicators. */
export function scrollViewport(input: MenuInput): Rect | undefined {
  const region = input.scrollRegion;
  if (region === undefined) {
    return undefined;
  }
  const top =
    input.moreIndicators.above === undefined ? region.y : rectBottom(input.moreIndicators.above);
  const bottom = input.moreIndicators.below?.y ?? region.y + region.height;
  return { x: region.x, y: top, width: region.width, height: Math.max(0, bottom - top) };
}

/** Whether `inner` lies completely inside `outer`. */
function isInside(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/** Whether a widget can be hit: enabled and, inside the scroll region, not scrolled out of view. */
export function isHittable(widget: Widget, input: MenuInput): boolean {
  if (widget.isDisabled) {
    return false;
  }
  const region = input.scrollRegion;
  const viewport = scrollViewport(input);
  if (region === undefined || viewport === undefined || !rectsIntersect(widget.rect, region)) {
    return true;
  }
  return isInside(widget.rect, viewport);
}

/** Whether a point hits a widget: its hit rect, and for initials also the widened letter boxes. */
export function isOnWidget(widget: Widget, point: Point, minTouchTarget: number): boolean {
  if (rectContains(hitRect(widget.rect, minTouchTarget), point)) {
    return true;
  }
  return (
    widget.kind === 'initials' &&
    initialsHitAreas(widget, minTouchTarget).some((area) => rectContains(area.box, point))
  );
}

/** The hittable widget at a point. */
export function hitWidget(
  widgets: readonly Widget[],
  point: Point,
  input: MenuInput,
): Widget | undefined {
  const candidates = widgets.filter((widget) => isHittable(widget, input));
  const found = widgetAt(candidates, point, input.minTouchTarget);
  if (found !== undefined) {
    return found;
  }
  return candidates.find(
    (widget) => widget.kind === 'initials' && isOnWidget(widget, point, input.minTouchTarget),
  );
}

/** The touch area of a slider track: the track widened vertically to ≥ minTouchTarget. */
export function trackHitRect(widget: SliderWidget, input: MenuInput): Rect {
  const track = sliderTrackRect(widget, { text: input.text, minTouchTarget: input.minTouchTarget });
  const height = Math.max(track.height, input.minTouchTarget);
  return { ...track, y: track.y - Math.floor((height - track.height) / 2), height };
}

/** The press id at a point: a more-indicator, a widget or the scroll region background. */
export function pressTarget(
  widgets: readonly Widget[],
  point: Point,
  input: MenuInput,
): string | undefined {
  const { above, below } = input.moreIndicators;
  if (above !== undefined && rectContains(above, point)) {
    return MORE_ABOVE_ID;
  }
  if (below !== undefined && rectContains(below, point)) {
    return MORE_BELOW_ID;
  }
  const widget = hitWidget(widgets, point, input);
  if (widget !== undefined) {
    return widget.id;
  }
  const region = input.scrollRegion;
  return region !== undefined && rectContains(region, point) ? BACKGROUND_ID : undefined;
}
