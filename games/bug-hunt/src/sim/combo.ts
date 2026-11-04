import { TUNING } from '../content/tuning.ts';
import type { Multiplier } from './state.ts';

/** Multiplier of a streak: ≥ 20 → 4, ≥ 10 → 3, ≥ 5 → 2, else 1. */
export function comboMultiplier(streak: number): Multiplier {
  if (streak >= TUNING.combo.stage4) {
    return 4;
  }
  if (streak >= TUNING.combo.stage3) {
    return 3;
  }
  return streak >= TUNING.combo.stage2 ? 2 : 1;
}
