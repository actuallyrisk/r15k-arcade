/** Injected time source; nothing outside time/ and loop/ reads the system clocks directly. */
export interface Clock {
  /** Monotonic milliseconds (performance.now in browsers). */
  now(): number;
  /** Wall-clock epoch milliseconds (Date.now). Used only for local dates. */
  wallTimeMs(): number;
}

/** The system clock (`performance.now`, `Date.now`). */
export function createSystemClock(): Clock {
  return {
    now: () => performance.now(),
    wallTimeMs: () => Date.now(),
  };
}

/** A clock that only moves when told to (tests, snapshot harness). */
export interface FakeClock extends Clock {
  /** Lets `ms` pass on both the monotonic and the wall clock; negative or non-finite values throw. */
  advance(ms: number): void;
  /** Sets the wall clock only (the monotonic clock never jumps). */
  setWallTime(epochMs: number): void;
}

/** 2026-11-04T00:00:00Z, the default wall time of fake clocks. */
const DEFAULT_WALL_TIME_MS = 1_793_750_400_000;

/** Creates a fake clock; defaults: `startMs` 0, `wallTimeMs` 1_793_750_400_000 (2026-11-04T00:00:00Z). */
export function createFakeClock(options?: {
  readonly startMs?: number;
  readonly wallTimeMs?: number;
}): FakeClock {
  let monotonicMs = options?.startMs ?? 0;
  let wallMs = options?.wallTimeMs ?? DEFAULT_WALL_TIME_MS;
  return {
    now: () => monotonicMs,
    wallTimeMs: () => wallMs,
    advance(ms: number): void {
      if (!(ms >= 0) || !Number.isFinite(ms)) {
        throw new RangeError(`FakeClock.advance: expected a finite ms ≥ 0, got ${ms}`);
      }
      monotonicMs += ms;
      wallMs += ms;
    },
    setWallTime(epochMs: number): void {
      wallMs = epochMs;
    },
  };
}
