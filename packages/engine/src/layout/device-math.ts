// Float-safe rounding for layout arithmetic in device pixels. Products such as 48 × 2.625 or
// 24 × 2.625 − 1 are exact in theory but may come out a few ulps off in binary floating point, which
// would move a ceil or floor by a whole pixel; the tolerance is far below any real fraction of a device
// pixel (DPR values carry at most three decimals).

const EPSILON = 1e-6;

/** `Math.ceil` that ignores floating-point noise just above an integer; never returns −0. */
export function ceilSafe(value: number): number {
  // Adding 0 turns −0 (Math.ceil of a small negative value) into +0.
  return Math.ceil(value - EPSILON) + 0;
}

/** `Math.floor` that ignores floating-point noise just below an integer; never returns −0. */
export function floorSafe(value: number): number {
  return Math.floor(value + EPSILON) + 0;
}

/** Whether `value ≥ minimum`, tolerating floating-point noise just below `minimum`. */
export function isAtLeast(value: number, minimum: number): boolean {
  return value >= minimum - EPSILON;
}
