import { notImplemented } from '../util/assert.ts';

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

/** Expands a 32-bit seed with splitmix32 into a xoshiro128** state. */
export function seedRng(_seed: number): RngState {
  return notImplemented('engine.seedRng');
}

/** Opens a mutable cursor on a copy of the state. */
export function openRng(_state: RngState): RngCursor {
  return notImplemented('engine.openRng');
}

/** Closes a cursor into a frozen state snapshot. */
export function closeRng(_cursor: RngCursor): RngState {
  return notImplemented('engine.closeRng');
}

/** Next unsigned 32-bit output of xoshiro128**. */
export function nextUint32(_cursor: RngCursor): number {
  return notImplemented('engine.nextUint32');
}

/** Next float in [0, 1) with exactly 24 random bits. */
export function nextFloat(_cursor: RngCursor): number {
  return notImplemented('engine.nextFloat');
}

/** Unbiased integer in [0, maxExclusive); `maxExclusive` must be an integer in 1…2^32, else it throws. */
export function nextInt(_cursor: RngCursor, _maxExclusive: number): number {
  return notImplemented('engine.nextInt');
}

/** Whether the next float is below `probability`. */
export function nextChance(_cursor: RngCursor, _probability: number): boolean {
  return notImplemented('engine.nextChance');
}

/** Picks one item uniformly; throws on an empty list. */
export function pickOne<T>(_cursor: RngCursor, _items: readonly T[]): T {
  return notImplemented('engine.pickOne');
}
