import { expect, test } from 'vitest';
import { openRng, nextFloat, seedRng } from '../random/xoshiro128.ts';
import type { Clock } from '../time/clock.ts';
import { createManualScheduler } from './frame-scheduler.ts';
import type { ManualScheduler } from './frame-scheduler.ts';
import { GameLoop, MAX_CATCH_UP_STEPS, MAX_FRAME_DELTA_MS } from './game-loop.ts';
import type { LoopFrame, LoopHooks } from './game-loop.ts';

const STEP_MS = 1000 / 120;

/** A clock that jitters by ±2 ms on every read; the loop must never depend on it inside a frame. */
function jitteryClock(): Clock & { readonly reads: () => number } {
  let reads = 0;
  return {
    now: () => {
      reads += 1;
      return reads * 16 + (reads % 2 === 0 ? 2 : -2);
    },
    wallTimeMs: () => 0,
    reads: () => reads,
  };
}

/** Hooks that do nothing. */
function createHooks(): LoopHooks {
  return {
    beginFrame: () => undefined,
    step: () => undefined,
    render: () => undefined,
    shouldContinue: () => false,
    onError: () => undefined,
  };
}

interface Harness {
  readonly loop: GameLoop;
  readonly scheduler: ManualScheduler;
  readonly frames: LoopFrame[];
  readonly steps: number[];
  readonly errors: unknown[];
  isContinuing: boolean;
}

/** A loop on a manual scheduler that records its frames; `hooks` replaces individual hooks. */
function createHarness(hooks: Partial<LoopHooks> = {}, stepHz?: number): Harness {
  const scheduler = createManualScheduler();
  const harness: Omit<Harness, 'loop'> & { isContinuing: boolean } = {
    scheduler,
    frames: [],
    steps: [],
    errors: [],
    isContinuing: true,
  };
  const loop = new GameLoop({
    clock: jitteryClock(),
    scheduler,
    ...(stepHz === undefined ? {} : { stepHz }),
    hooks: {
      beginFrame: () => undefined,
      step: (dt) => harness.steps.push(dt),
      render: (frame) => harness.frames.push(frame),
      shouldContinue: () => harness.isContinuing,
      onError: (error) => harness.errors.push(error),
      ...hooks,
    },
  });
  return Object.assign(harness, { loop });
}

/** Runs frames at `start + index × intervalMs`, computed per frame like a display would report them. */
function runFrames(harness: Harness, count: number, intervalMs: number): void {
  for (let index = 0; index < count; index += 1) {
    harness.scheduler.runFrame(1000 + index * intervalMs);
  }
}

test('60 Hz frames run exactly two steps each, whatever the clock does', () => {
  const clock = jitteryClock();
  const scheduler = createManualScheduler();
  const steps: number[] = [];
  const loop = new GameLoop({
    clock,
    scheduler,
    hooks: {
      beginFrame: () => clock.now(),
      step: () => undefined,
      render: (frame) => steps.push(frame.steps),
      shouldContinue: () => true,
      onError: (error) => {
        throw error;
      },
    },
  });
  loop.wake();
  for (let index = 0; index < 600; index += 1) {
    scheduler.runFrame(5000 + (index * 1000) / 60);
  }
  expect(steps[0]).toBe(0);
  expect(new Set(steps.slice(1))).toEqual(new Set([2]));
  expect(loop.totalSteps).toBe(1198);
});

test('30 Hz frames run four steps and 144 Hz frames keep 120 steps per second', () => {
  const slow = createHarness();
  slow.loop.wake();
  runFrames(slow, 61, 1000 / 30);
  expect(new Set(slow.frames.slice(1).map((frame) => frame.steps))).toEqual(new Set([4]));
  const fast = createHarness();
  fast.loop.wake();
  runFrames(fast, 145, 1000 / 144);
  expect(fast.loop.totalSteps).toBe(120);
  expect(new Set(fast.frames.map((frame) => frame.steps))).toEqual(new Set([0, 1]));
  expect(fast.steps.every((dt) => dt === 1 / 120)).toBe(true);
});

test('the first frame after wake has delta 0, later deltas are clamped', () => {
  const harness = createHarness();
  harness.loop.wake();
  harness.scheduler.runFrame(100);
  harness.scheduler.runFrame(100 + 1000);
  harness.scheduler.runFrame(50);
  const [first, long, backwards] = harness.frames;
  expect(first).toMatchObject({ timeMs: 100, deltaMs: 0, steps: 0, droppedMs: 0, alpha: 0 });
  expect(long?.deltaMs).toBe(MAX_FRAME_DELTA_MS);
  expect(backwards?.deltaMs).toBe(0);
});

test('the catch-up cap drops whole steps and keeps the remainder for alpha', () => {
  const harness = createHarness();
  harness.loop.wake();
  harness.scheduler.runFrame(0);
  harness.scheduler.runFrame(105);
  const frame = harness.frames[1];
  expect(frame?.steps).toBe(MAX_CATCH_UP_STEPS);
  expect(frame?.droppedMs).toBeCloseTo(7 * STEP_MS, 9);
  expect(frame?.alpha).toBeCloseTo(5 / STEP_MS, 9);
  harness.scheduler.runFrame(105 + STEP_MS);
  expect(harness.frames[2]?.steps).toBe(1);
  expect(harness.frames[2]?.droppedMs).toBe(0);
});

test('alpha stays in [0, 1) for irregular frame times', () => {
  const harness = createHarness();
  const cursor = openRng(seedRng(99));
  harness.loop.wake();
  let time = 0;
  for (let index = 0; index < 2000; index += 1) {
    time += nextFloat(cursor) * 40;
    harness.scheduler.runFrame(time);
  }
  for (const frame of harness.frames) {
    expect(frame.alpha >= 0 && frame.alpha < 1).toBe(true);
    expect(frame.steps).toBeLessThanOrEqual(MAX_CATCH_UP_STEPS);
  }
});

test('shouldContinue false stops the loop after the frame', () => {
  const harness = createHarness();
  harness.isContinuing = false;
  expect(harness.loop.isRunning).toBe(false);
  harness.loop.wake();
  harness.loop.wake();
  expect(harness.scheduler.pendingCount).toBe(1);
  expect(harness.loop.isRunning).toBe(true);
  harness.scheduler.runFrame(10);
  expect(harness.loop.isRunning).toBe(false);
  expect(harness.scheduler.pendingCount).toBe(0);
});

test('stop cancels the frame; wake resets the timer but keeps the accumulator', () => {
  const harness = createHarness();
  harness.loop.wake();
  harness.scheduler.runFrame(0);
  harness.scheduler.runFrame(12);
  harness.loop.stop();
  harness.loop.stop();
  expect(harness.scheduler.pendingCount).toBe(0);
  expect(harness.loop.isRunning).toBe(false);
  harness.loop.wake();
  harness.scheduler.runFrame(5000);
  const resumed = harness.frames[2];
  expect(resumed?.deltaMs).toBe(0);
  expect(resumed?.alpha).toBeCloseTo((12 - STEP_MS) / STEP_MS, 9);
  harness.scheduler.runFrame(5000 + 5);
  expect(harness.frames[3]?.steps).toBe(1);
});

test('a throwing hook stops the loop and reaches onError, which may wake it again', () => {
  let isFailing = true;
  const failure = new Error('render failed');
  const harness = createHarness({
    render: () => {
      if (isFailing) {
        throw failure;
      }
    },
    onError: (error) => {
      harness.errors.push(error);
      isFailing = false;
      harness.loop.wake();
    },
  });
  harness.loop.wake();
  harness.scheduler.runFrame(0);
  expect(harness.errors).toEqual([failure]);
  expect(harness.loop.isRunning).toBe(true);
  expect(harness.scheduler.runFrame(16)).toBe(true);
  expect(harness.errors).toHaveLength(1);
});

test('a throwing step keeps the steps that completed', () => {
  let count = 0;
  const harness = createHarness({
    step: () => {
      count += 1;
      if (count === 2) {
        throw new Error('step failed');
      }
    },
  });
  harness.loop.wake();
  harness.scheduler.runFrame(0);
  harness.scheduler.runFrame(50);
  expect(harness.loop.totalSteps).toBe(1);
  expect(harness.errors).toHaveLength(1);
  expect(harness.loop.isRunning).toBe(false);
});

test('wake and stop called by hooks decide about the next frame', () => {
  const states: boolean[] = [];
  const harness = createHarness({
    beginFrame: () => {
      states.push(harness.loop.isRunning);
      harness.loop.stop();
      states.push(harness.loop.isRunning);
    },
    render: () => {
      harness.loop.wake();
    },
  });
  harness.isContinuing = false;
  harness.loop.wake();
  harness.scheduler.runFrame(0);
  expect(states).toEqual([true, false]);
  expect(harness.scheduler.pendingCount).toBe(1);
});

test('stop called by a hook ends a loop that would continue', () => {
  const harness = createHarness({
    render: () => {
      harness.loop.stop();
    },
  });
  harness.loop.wake();
  harness.scheduler.runFrame(0);
  expect(harness.loop.isRunning).toBe(false);
  expect(harness.scheduler.pendingCount).toBe(0);
});

test('a custom step rate is honoured and invalid options throw', () => {
  const harness = createHarness({}, 60);
  harness.loop.wake();
  runFrames(harness, 11, 1000 / 60);
  expect(harness.loop.totalSteps).toBe(10);
  expect(harness.steps[0]).toBe(1 / 60);
  const base = { clock: jitteryClock(), scheduler: createManualScheduler(), hooks: createHooks() };
  expect(() => new GameLoop({ ...base, stepHz: 0 })).toThrow(RangeError);
  expect(() => new GameLoop({ ...base, stepHz: Number.POSITIVE_INFINITY })).toThrow(RangeError);
  expect(() => new GameLoop({ ...base, maxCatchUpSteps: 0 })).toThrow(RangeError);
  expect(() => new GameLoop({ ...base, maxCatchUpSteps: 1.5 })).toThrow(RangeError);
});
