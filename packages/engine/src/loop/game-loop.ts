import type { Clock } from '../time/clock.ts';
import { notImplemented } from '../util/assert.ts';
import type { FrameScheduler } from './frame-scheduler.ts';

/** Most fixed steps run in one frame; the rest of the backlog is dropped. */
export const MAX_CATCH_UP_STEPS = 5;

/** Largest real frame delta the loop accepts in milliseconds (longer gaps are clamped). */
export const MAX_FRAME_DELTA_MS = 250;

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
  readonly render: (frame: LoopFrame) => void;
  /** `false` stops the loop after this frame. */
  readonly shouldContinue: () => boolean;
  readonly onError: (error: unknown) => void;
}

/** Construction options of the game loop. */
export interface GameLoopOptions {
  readonly clock: Clock;
  readonly scheduler: FrameScheduler;
  readonly hooks: LoopHooks;
  /** Default SIM_STEP_HZ. */
  readonly stepHz?: number;
  /** Default MAX_CATCH_UP_STEPS. */
  readonly maxCatchUpSteps?: number;
}

/** Fixed-step game loop with render interpolation that sleeps while nothing runs. */
export class GameLoop {
  constructor(_options: GameLoopOptions) {
    return notImplemented('engine.GameLoop.constructor');
  }

  /** Schedules a frame if the loop is stopped; resets the frame timer (first delta = 0). Idempotent. */
  wake(): void {
    return notImplemented('engine.GameLoop.wake');
  }

  /** Cancels the pending frame; accumulator is kept, timer reset on next wake. */
  stop(): void {
    return notImplemented('engine.GameLoop.stop');
  }

  /** Whether a frame is scheduled. */
  get isRunning(): boolean {
    return notImplemented('engine.GameLoop.isRunning');
  }

  /** Fixed steps run since construction. */
  get totalSteps(): number {
    return notImplemented('engine.GameLoop.totalSteps');
  }
}
