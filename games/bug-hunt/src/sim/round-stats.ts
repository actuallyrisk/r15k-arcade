import { notImplemented } from '@r15k/engine';
import type { RoundStats } from '@r15k/engine';
import type { BugHuntState } from './state.ts';

/** Round statistics of a state; durationSeconds = playTicks / 120. */
export function toRoundStats(_state: BugHuntState): RoundStats {
  return notImplemented('bug-hunt.toRoundStats');
}
