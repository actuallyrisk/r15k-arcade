import { SIM_STEP_HZ } from '@r15k/engine';
import type { RoundStats } from '@r15k/engine';
import type { BugHuntState } from './state.ts';

/** Round statistics of a state; durationSeconds = playTicks / 120. */
export function toRoundStats(state: BugHuntState): RoundStats {
  const { stats } = state;
  return {
    bugsCaught: stats.bugsCaught,
    goldenCaught: stats.goldenCaught,
    bombsCaught: stats.bombsCaught,
    misses: stats.misses,
    bombsDodged: stats.bombsDodged,
    bestStreak: stats.bestStreak,
    durationSeconds: state.playTicks / SIM_STEP_HZ,
  };
}
