import { lerp } from '@r15k/engine';
import type { Layout, Point } from '@r15k/engine';
import { TUNING } from '../content/tuning.ts';
import type { BugHuntState, Item } from '../sim/state.ts';
import type { CatchTween } from './round-view-state.ts';

/** Row of the ground's ink line: the ground band fills the bottom of the field. */
export function groundLineY(layout: Layout): number {
  return layout.field.y + layout.field.height - TUNING.ground.height;
}

/** Bottom edge of an item at a fall progress: linear from the field top (0) to the ground line (1). */
export function itemBottomY(layout: Layout, fall: number): number {
  return layout.field.y + fall * (groundLineY(layout) - layout.field.y);
}

/**
 * Fall progress of an item as drawn: interpolated between the previous and the current step when the
 * item exists in both, else its current progress.
 */
export function drawnFall(previous: BugHuntState, item: Item, alpha: number): number {
  const before = previous.items.find((candidate) => candidate.id === item.id);
  return before === undefined ? item.fall : lerp(before.fall, item.fall, alpha);
}

/** Left edge of the cat on the canvas, interpolated with alpha and rounded to a pixel. */
export function catScreenX(
  layout: Layout,
  states: { readonly previous: BugHuntState; readonly current: BugHuntState },
  alpha: number,
): number {
  return Math.round(layout.field.x + lerp(states.previous.cat.x, states.current.cat.x, alpha));
}

/** Top of the cat sprite on the canvas; the hop lifts it by `hopPixels`. */
export function catTopY(layout: Layout, hopPixels: number): number {
  return groundLineY(layout) - TUNING.cat.height - hopPixels;
}

/**
 * Top-left corner of a caught item flying into the cat's paws: linear from where the item was last
 * drawn to the paws over the tween duration.
 */
export function catchTweenPosition(
  layout: Layout,
  tween: CatchTween,
  target: { readonly catX: number; readonly catTop: number; readonly spriteHeight: number },
): Point {
  const from = {
    x: layout.field.x + tween.fromX,
    y: itemBottomY(layout, tween.fromFall) - target.spriteHeight,
  };
  const cat = { x: target.catX, top: target.catTop };
  const to = {
    x: cat.x + TUNING.cat.width / 2 - TUNING.item.width / 2,
    y: cat.top + TUNING.cat.height / 2 - TUNING.item.width,
  };
  const fraction = Math.min(1, Math.max(0, tween.ageSeconds / TUNING.view.catchTweenSeconds));
  return {
    x: Math.round(lerp(from.x, to.x, fraction)),
    y: Math.round(lerp(from.y, to.y, fraction)),
  };
}
