import { notImplemented } from '../util/assert.ts';

/**
 * Schedules display frames. The callback receives the frame timestamp (same timeline as
 * performance.now(): the vsync-aligned frame start, free of callback start jitter).
 */
export interface FrameScheduler {
  request(callback: (timeMs: number) => void): number;
  cancel(handle: number): void;
}

/** A scheduler on top of `requestAnimationFrame`. */
export function createAnimationFrameScheduler(
  _host: Pick<Window, 'requestAnimationFrame' | 'cancelAnimationFrame'>,
): FrameScheduler {
  return notImplemented('engine.createAnimationFrameScheduler');
}

/** A scheduler whose frames run only when a test or the snapshot harness calls `runFrame`. */
export interface ManualScheduler extends FrameScheduler {
  runFrame(timeMs: number): boolean;
  readonly pendingCount: number;
}

/** Creates a manual scheduler (tests, snapshot harness). */
export function createManualScheduler(): ManualScheduler {
  return notImplemented('engine.createManualScheduler');
}
