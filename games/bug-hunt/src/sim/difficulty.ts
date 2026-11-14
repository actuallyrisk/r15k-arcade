import { TUNING } from '../content/tuning.ts';
import { ROUND_TICKS } from './derived.ts';
import type { BugHuntState, ItemKind } from './state.ts';

/** Difficulty progress 0…1: min(1, playTicks / round ticks). */
export function difficultyProgress(state: BugHuntState): number {
  return Math.min(1, state.playTicks / ROUND_TICKS);
}

/** Spawn interval in seconds for a progress and a jitter draw. */
export function spawnIntervalSeconds(progress: number, jitter: number): number {
  const { baseSeconds, progressReduction, jitterMin, jitterRange } = TUNING.spawn;
  return (baseSeconds - progressReduction * progress) * (jitterMin + jitterRange * jitter);
}

/** Fall time in seconds for a progress, a jitter draw and an item kind. */
export function fallSeconds(options: {
  readonly progress: number;
  readonly jitter: number;
  readonly kind: ItemKind;
}): number {
  const { distance, baseRate, progressRate, jitterRate, goldenSpeedFactor } = TUNING.fall;
  const seconds =
    distance / (baseRate + progressRate * options.progress + jitterRate * options.jitter);
  return options.kind === 'golden' ? seconds / goldenSpeedFactor : seconds;
}
