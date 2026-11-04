import { notImplemented } from '@r15k/engine';
import type { BugHuntState, ItemKind } from './state.ts';

/** Difficulty progress 0…1: min(1, playTicks / round ticks). */
export function difficultyProgress(_state: BugHuntState): number {
  return notImplemented('bug-hunt.difficultyProgress');
}

/** Spawn interval in seconds for a progress and a jitter draw. */
export function spawnIntervalSeconds(_progress: number, _jitter: number): number {
  return notImplemented('bug-hunt.spawnIntervalSeconds');
}

/** Fall time in seconds for a progress, a jitter draw and an item kind. */
export function fallSeconds(_options: {
  readonly progress: number;
  readonly jitter: number;
  readonly kind: ItemKind;
}): number {
  return notImplemented('bug-hunt.fallSeconds');
}
