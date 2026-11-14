import { SIM_STEP_HZ } from '../math/fixed-step.ts';
import type { Clock } from '../time/clock.ts';
import type { FrameScheduler } from './frame-scheduler.ts';

/** Most fixed steps run in one frame; the rest of the backlog is dropped. */
export const MAX_CATCH_UP_STEPS = 5;

/** Largest real frame delta the loop accepts in milliseconds (longer gaps are clamped). */
export const MAX_FRAME_DELTA_MS = 250;

/**
 * Tolerance for comparing the accumulator with the step length: frame timestamps such as n × 1000/60
 * are not exact in binary floating point, and a backlog of 1e-12 ms short of a step must still run it.
 */
const STEP_EPSILON_MS = 1e-6;

/** What one display frame did. */
export interface LoopFrame {
  /** Scheduler timestamp of this frame. */
  readonly timeMs: number;
  /** Clamped real delta (0 on the first frame after wake). */
  readonly deltaMs: number;
  /** Fixed steps run this frame (0…5). */
  readonly steps: number;
  /** Backlog discarded because of the catch-up limit. */
  readonly droppedMs: number;
  /** Accumulator / step, 0 ≤ alpha < 1 (render interpolation). */
  readonly alpha: number;
}

/** Callbacks of the loop; any hook that throws calls `onError` and stops the loop. */
export interface LoopHooks {
  /** Input poll and scene update, once per frame. */
  readonly beginFrame: (timeMs: number, deltaMs: number) => void;
  /** One fixed step (scene fixedUpdate). */
  readonly step: (dtSeconds: number) => void;
  /** Draws and presents the frame. */
  readonly render: (frame: LoopFrame) => void;
  /** `false` stops the loop after this frame. */
  readonly shouldContinue: () => boolean;
  /** Receives the error of a throwing hook after the loop has stopped (it may wake the loop again). */
  readonly onError: (error: unknown) => void;
}

/** Construction options of the game loop. */
export interface GameLoopOptions {
  /**
   * The app clock. Frames are timed only by the scheduler timestamps (the first delta after `wake()`
   * is 0), so the loop never reads a clock inside a frame.
   */
  readonly clock: Clock;
  readonly scheduler: FrameScheduler;
  readonly hooks: LoopHooks;
  /** Default SIM_STEP_HZ. */
  readonly stepHz?: number;
  /** Default MAX_CATCH_UP_STEPS. */
  readonly maxCatchUpSteps?: number;
}

/** What a hook asked for during a frame: wake() → 'continue', stop() → 'stop' (the last call wins). */
type FrameRequest = 'continue' | 'stop' | undefined;

/** Fixed steps run and backlog dropped while advancing the accumulator. */
interface Advance {
  readonly steps: number;
  readonly droppedMs: number;
}

/**
 * Fixed-step game loop with render interpolation that sleeps while nothing runs. Per frame:
 * `beginFrame`, up to `maxCatchUpSteps` fixed steps, `render`, then `shouldContinue` decides whether
 * the next frame is requested. `wake()` or `stop()` called by a hook during a frame decides instead
 * (the last call wins), so a wake request from inside a frame is never lost.
 */
export class GameLoop {
  readonly #scheduler: FrameScheduler;
  readonly #hooks: LoopHooks;
  readonly #stepMs: number;
  readonly #stepSeconds: number;
  readonly #maxCatchUpSteps: number;
  readonly #onFrame = (timeMs: number): void => {
    this.#runFrame(timeMs);
  };
  #handle: number | undefined;
  #isInFrame = false;
  #frameRequest: FrameRequest;
  #lastTimeMs: number | undefined;
  #accumulatorMs = 0;
  #totalSteps = 0;

  /** Creates a stopped loop; `stepHz` must be positive and `maxCatchUpSteps` an integer ≥ 1. */
  constructor(options: GameLoopOptions) {
    const stepHz = options.stepHz ?? SIM_STEP_HZ;
    const maxCatchUpSteps = options.maxCatchUpSteps ?? MAX_CATCH_UP_STEPS;
    if (!(stepHz > 0) || !Number.isFinite(stepHz)) {
      throw new RangeError(`GameLoop: stepHz must be positive, got ${stepHz}`);
    }
    if (!Number.isInteger(maxCatchUpSteps) || maxCatchUpSteps < 1) {
      throw new RangeError(
        `GameLoop: maxCatchUpSteps must be an integer ≥ 1, got ${maxCatchUpSteps}`,
      );
    }
    this.#scheduler = options.scheduler;
    this.#hooks = options.hooks;
    this.#stepMs = 1000 / stepHz;
    this.#stepSeconds = 1 / stepHz;
    this.#maxCatchUpSteps = maxCatchUpSteps;
  }

  /** Schedules a frame if the loop is stopped; resets the frame timer (first delta = 0). Idempotent. */
  wake(): void {
    if (this.#isInFrame) {
      this.#frameRequest = 'continue';
      return;
    }
    if (this.#handle !== undefined) {
      return;
    }
    this.#lastTimeMs = undefined;
    this.#handle = this.#scheduler.request(this.#onFrame);
  }

  /** Cancels the pending frame; accumulator is kept, timer reset on next wake. */
  stop(): void {
    if (this.#isInFrame) {
      this.#frameRequest = 'stop';
    }
    if (this.#handle !== undefined) {
      this.#scheduler.cancel(this.#handle);
      this.#handle = undefined;
    }
  }

  /** Whether a frame is scheduled (or running and not asked to stop). */
  get isRunning(): boolean {
    return this.#handle !== undefined || (this.#isInFrame && this.#frameRequest !== 'stop');
  }

  /** Fixed steps run since construction. */
  get totalSteps(): number {
    return this.#totalSteps;
  }

  /** Scheduler callback: one frame, then the next request or the stop. */
  #runFrame(timeMs: number): void {
    this.#handle = undefined;
    this.#isInFrame = true;
    this.#frameRequest = undefined;
    let isContinuing: boolean;
    try {
      isContinuing = this.#frame(timeMs);
    } catch (error: unknown) {
      this.#isInFrame = false;
      this.#frameRequest = undefined;
      this.#hooks.onError(error);
      return;
    }
    this.#isInFrame = false;
    const request = this.#takeFrameRequest();
    if (request === 'continue' || (request === undefined && isContinuing)) {
      this.#handle = this.#scheduler.request(this.#onFrame);
    }
  }

  /** Returns and clears the wake or stop request made by a hook during the frame. */
  #takeFrameRequest(): FrameRequest {
    const request = this.#frameRequest;
    this.#frameRequest = undefined;
    return request;
  }

  /** Runs the hooks of one frame and returns `shouldContinue()`. */
  #frame(timeMs: number): boolean {
    const last = this.#lastTimeMs;
    const deltaMs =
      last === undefined ? 0 : Math.min(Math.max(timeMs - last, 0), MAX_FRAME_DELTA_MS);
    this.#lastTimeMs = timeMs;
    this.#hooks.beginFrame(timeMs, deltaMs);
    const { steps, droppedMs } = this.#advance(deltaMs);
    const alpha = this.#accumulatorMs / this.#stepMs;
    this.#hooks.render({ timeMs, deltaMs, steps, droppedMs, alpha });
    return this.#hooks.shouldContinue();
  }

  /** Adds the delta to the accumulator, runs the fixed steps and drops what exceeds the cap. */
  #advance(deltaMs: number): Advance {
    this.#accumulatorMs += deltaMs;
    const threshold = this.#stepMs - STEP_EPSILON_MS;
    let steps = 0;
    while (this.#accumulatorMs >= threshold && steps < this.#maxCatchUpSteps) {
      this.#hooks.step(this.#stepSeconds);
      this.#accumulatorMs -= this.#stepMs;
      steps += 1;
      this.#totalSteps += 1;
    }
    let droppedMs = 0;
    if (this.#accumulatorMs >= threshold) {
      droppedMs = Math.floor((this.#accumulatorMs + STEP_EPSILON_MS) / this.#stepMs) * this.#stepMs;
      this.#accumulatorMs -= droppedMs;
    }
    // A step taken within the tolerance leaves a tiny negative remainder.
    this.#accumulatorMs = Math.max(this.#accumulatorMs, 0);
    return { steps, droppedMs };
  }
}
