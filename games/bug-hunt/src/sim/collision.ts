import { notImplemented } from '@r15k/engine';
import type { Cat, Item } from './state.ts';

/** Whether an item overlaps the catch zone (the cat minus the catch inset on each side). */
export function isCaught(_item: Item, _cat: Cat): boolean {
  return notImplemented('bug-hunt.isCaught');
}
