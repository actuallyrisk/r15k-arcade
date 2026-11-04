import { notImplemented } from '../util/assert.ts';

/** Injected time source; nothing outside time/ and loop/ reads the system clocks directly. */
export interface Clock {
  /** Monotonic milliseconds (performance.now in browsers). */
  now(): number;
  /** Wall-clock epoch milliseconds (Date.now). Used only for local dates. */
  wallTimeMs(): number;
}

/** The system clock (`performance.now`, `Date.now`). */
export function createSystemClock(): Clock {
  return notImplemented('engine.createSystemClock');
}

/** A clock that only moves when told to (tests, snapshot harness). */
export interface FakeClock extends Clock {
  advance(ms: number): void;
  setWallTime(epochMs: number): void;
}

/** Creates a fake clock; defaults: `startMs` 0, `wallTimeMs` 1_793_750_400_000 (2026-11-04T00:00:00Z). */
export function createFakeClock(_options?: {
  readonly startMs?: number;
  readonly wallTimeMs?: number;
}): FakeClock {
  return notImplemented('engine.createFakeClock');
}
