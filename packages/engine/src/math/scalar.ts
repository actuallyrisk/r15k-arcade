// Uses only the exactly specified operations (+ − × ÷, %, comparisons, Math.min/max/abs/floor), so
// deterministic simulations may call these functions.

/** Limits `value` to `[min, max]`. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation from `from` to `to`. */
export function lerp(from: number, to: number, fraction: number): number {
  return from + (to - from) * fraction;
}

/** Fraction of `value` between `from` and `to`; 0 when `from === to`. */
export function inverseLerp(from: number, to: number, value: number): number {
  return from === to ? 0 : (value - from) / (to - from);
}

/** Moves `current` towards `target` by at most `maxDelta` (a negative `maxDelta` counts as 0). */
export function approach(current: number, target: number, maxDelta: number): number {
  const step = Math.max(0, maxDelta);
  return current < target ? Math.min(current + step, target) : Math.max(current - step, target);
}

/** Whether two numbers differ by at most `epsilon`. */
export function isNearlyEqual(a: number, b: number, epsilon: number): boolean {
  return Math.abs(a - b) <= epsilon;
}

/**
 * Triangle wave 0…1…0 over one period, without trigonometry (UI blinking and bobbing): 0 at whole
 * periods, 1 at half periods. Throws when `periodSeconds` is not positive.
 */
export function triangleWave(timeSeconds: number, periodSeconds: number): number {
  if (!(periodSeconds > 0)) {
    throw new RangeError(`triangleWave: period must be positive, got ${periodSeconds}`);
  }
  const cycles = timeSeconds / periodSeconds;
  const phase = cycles - Math.floor(cycles);
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}
