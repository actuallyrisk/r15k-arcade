import { TUNING } from '../content/tuning.ts';
import type { Cat, Item } from './state.ts';

/** Whether an item overlaps the catch zone (the cat minus the catch inset on each side). */
export function isCaught(item: Item, cat: Cat): boolean {
  const zoneLeft = cat.x + TUNING.cat.catchInset;
  const zoneRight = cat.x + TUNING.cat.width - TUNING.cat.catchInset;
  return item.x + TUNING.item.width > zoneLeft && item.x < zoneRight;
}
