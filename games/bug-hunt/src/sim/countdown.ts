import { SIM_STEP_HZ } from '@r15k/engine';
import { ROUND_TICKS } from './derived.ts';
import type { BugHuntState } from './state.ts';

/** Seconds left in the round: ceil(remaining ticks / 120); the full round length during the countdown. */
export function secondsLeft(state: BugHuntState): number {
  return Math.max(0, Math.ceil((ROUND_TICKS - state.playTicks) / SIM_STEP_HZ));
}
