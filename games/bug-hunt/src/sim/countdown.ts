import { notImplemented } from '@r15k/engine';
import type { BugHuntState } from './state.ts';

/** Seconds left in the round: ceil(remaining ticks / 120); the full round length during the countdown. */
export function secondsLeft(_state: BugHuntState): number {
  return notImplemented('bug-hunt.secondsLeft');
}
