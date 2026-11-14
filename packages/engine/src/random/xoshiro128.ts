// xoshiro128** (Blackman/Vigna) seeded through splitmix32. Only 32-bit integer operations
// (Math.imul, shifts, xor), so the sequence is identical in every JavaScript engine.

/** Immutable generator snapshot: four uint32 words, never all zero. */
export interface RngState {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
}

/** Mutable working copy. Never stored in state; always closed with closeRng(). */
export interface RngCursor {
  a: number;
  b: number;
  c: number;
  d: number;
}

const GOLDEN_GAMMA = 0x9e3779b9;
const TWO_POW_24 = 16_777_216;
const TWO_POW_32 = 4_294_967_296;

/** Rotates a 32-bit word left by `bits`. */
function rotl(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

/**
 * Expands a 32-bit seed with splitmix32 into a xoshiro128** state: the four words are four successive
 * splitmix32 outputs. splitmix32 is a bijection over consecutive distinct states, so at most one word
 * can be zero.
 */
export function seedRng(seed: number): RngState {
  let state = seed | 0;
  const next = (): number => {
    state = (state + GOLDEN_GAMMA) | 0;
    let z = Math.imul(state ^ (state >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
  const a = next();
  const b = next();
  const c = next();
  const d = next();
  return Object.freeze({ a, b, c, d });
}

/** Opens a mutable cursor on a copy of the state. */
export function openRng(state: RngState): RngCursor {
  return { a: state.a, b: state.b, c: state.c, d: state.d };
}

/** Closes a cursor into a frozen state snapshot. */
export function closeRng(cursor: RngCursor): RngState {
  return Object.freeze({ a: cursor.a, b: cursor.b, c: cursor.c, d: cursor.d });
}

/** Next unsigned 32-bit output of xoshiro128**. */
export function nextUint32(cursor: RngCursor): number {
  const result = Math.imul(rotl(Math.imul(cursor.b, 5), 7), 9) >>> 0;
  const t = (cursor.b << 9) >>> 0;
  cursor.c = (cursor.c ^ cursor.a) >>> 0;
  cursor.d = (cursor.d ^ cursor.b) >>> 0;
  cursor.b = (cursor.b ^ cursor.c) >>> 0;
  cursor.a = (cursor.a ^ cursor.d) >>> 0;
  cursor.c = (cursor.c ^ t) >>> 0;
  cursor.d = rotl(cursor.d, 11);
  return result;
}

/** Next float in [0, 1) with exactly 24 random bits. */
export function nextFloat(cursor: RngCursor): number {
  return (nextUint32(cursor) >>> 8) / TWO_POW_24;
}

/**
 * Unbiased integer in [0, maxExclusive): outputs at or above the largest multiple of `maxExclusive`
 * below 2^32 are rejected and drawn again. `maxExclusive` must be an integer in 1…2^32, else it throws.
 */
export function nextInt(cursor: RngCursor, maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > TWO_POW_32) {
    throw new RangeError(`nextInt: maxExclusive must be an integer in 1…2^32, got ${maxExclusive}`);
  }
  const limit = TWO_POW_32 - (TWO_POW_32 % maxExclusive);
  let value = nextUint32(cursor);
  while (value >= limit) {
    value = nextUint32(cursor);
  }
  return value % maxExclusive;
}

/** Whether the next float is below `probability`. */
export function nextChance(cursor: RngCursor, probability: number): boolean {
  return nextFloat(cursor) < probability;
}

/** Picks one item uniformly; throws on an empty list. */
export function pickOne<T>(cursor: RngCursor, items: readonly T[]): T {
  if (items.length === 0) {
    throw new RangeError('pickOne: the list is empty');
  }
  const index = nextInt(cursor, items.length);
  return items[index] as T;
}
