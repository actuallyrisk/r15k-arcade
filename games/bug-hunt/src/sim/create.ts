import { seedRng } from '@r15k/engine';
import type { GameModeId } from '@r15k/engine';
import { TUNING } from '../content/tuning.ts';
import { CONTENT_VERSION } from '../content/version.ts';
import { CAT_START_X, COUNTDOWN_TICKS } from './derived.ts';
import type { BugHuntState, SimStats } from './state.ts';

/** Statistics of a round that has not started. */
const ZERO_STATS: SimStats = {
  bugsCaught: 0,
  goldenCaught: 0,
  bombsCaught: 0,
  misses: 0,
  bombsDodged: 0,
  bestStreak: 0,
};

/** The state at the start of a round (countdown phase). */
export function createInitialState(options: {
  readonly seed: number;
  readonly mode: GameModeId;
}): BugHuntState {
  return {
    mode: options.mode,
    seed: options.seed,
    contentVersion: CONTENT_VERSION,
    tick: 0,
    phase: 'countdown',
    countdownTicks: COUNTDOWN_TICKS,
    playTicks: 0,
    score: 0,
    streak: 0,
    multiplier: 1,
    cat: {
      x: CAT_START_X,
      facing: 1,
      isMoving: false,
      moveSeconds: 0,
      aimX: undefined,
      happySeconds: 0,
      startleSeconds: 0,
    },
    items: [],
    nextItemId: 1,
    spawnSeconds: TUNING.firstSpawnDelaySeconds,
    rng: seedRng(options.seed),
    stats: ZERO_STATS,
  };
}
