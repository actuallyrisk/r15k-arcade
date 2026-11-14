import { clamp } from '../math/scalar.ts';

/**
 * UI level 0…1 to gain: level² (a perceptual curve, so 50 % sounds about half as loud), clamped to
 * 0…1. NaN is treated as silence.
 */
export function levelToGain(level: number): number {
  if (Number.isNaN(level)) {
    return 0;
  }
  const clamped = clamp(level, 0, 1);
  return clamped * clamped;
}
