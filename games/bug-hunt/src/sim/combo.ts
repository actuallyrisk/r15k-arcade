import { notImplemented } from '@r15k/engine';
import type { Multiplier } from './state.ts';

/** Multiplier of a streak: ≥ 20 → 4, ≥ 10 → 3, ≥ 5 → 2, else 1. */
export function comboMultiplier(_streak: number): Multiplier {
  return notImplemented('bug-hunt.comboMultiplier');
}
