import { clamp } from '@r15k/engine';
import { TUNING } from '../content/tuning.ts';
import { isCaught } from './collision.ts';
import { BOT_AIM_OFFSET, CAT_CENTER_OFFSET, CAT_MAX_X, ITEM_CENTER_OFFSET } from './derived.ts';
import type { BugHuntState, Cat, Item } from './state.ts';

/** Cat left edge that centres the cat under an item. */
export function botAimX(item: Item): number {
  return clamp(item.x - BOT_AIM_OFFSET, 0, CAT_MAX_X);
}

/** Whether the cat's centre can reach the item's centre at `speed` px/s before the item lands. */
function isReachable(item: Item, cat: Cat, speed: number): boolean {
  const distance = Math.abs(item.x + ITEM_CENTER_OFFSET - (cat.x + CAT_CENTER_OFFSET));
  return distance <= speed * (1 - item.fall) * item.fallSeconds;
}

/** The reachable bug or golden bug that falls lowest (the lowest id on a tie), if any. */
export function botTarget(state: BugHuntState, speed: number): Item | undefined {
  let target: Item | undefined;
  for (const item of state.items) {
    const isCandidate = item.kind !== 'bomb' && isReachable(item, state.cat, speed);
    if (isCandidate && (target === undefined || item.fall > target.fall)) {
      target = item;
    }
  }
  return target;
}

/** The first bomb late in its fall that overlaps the catch zone of the cat at `catX`, if any. */
export function threateningBomb(state: BugHuntState, catX: number): Item | undefined {
  const cat: Cat = { ...state.cat, x: catX };
  return state.items.find(
    (item) =>
      item.kind === 'bomb' && item.fall >= TUNING.bot.avoidBombFallStart && isCaught(item, cat),
  );
}

/** Direction away from a bomb's centre; at a field edge the only way out is through. */
export function escapeDirection(cat: Cat, bomb: Item): -1 | 1 {
  const away = bomb.x + ITEM_CENTER_OFFSET <= cat.x + CAT_CENTER_OFFSET ? 1 : -1;
  const isBlocked = (away === 1 && cat.x >= CAT_MAX_X) || (away === -1 && cat.x <= 0);
  return isBlocked ? (away === 1 ? -1 : 1) : away;
}
