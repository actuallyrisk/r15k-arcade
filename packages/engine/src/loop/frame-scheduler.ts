/**
 * Schedules display frames. The callback receives the frame timestamp (same timeline as
 * performance.now(): the vsync-aligned frame start, free of callback start jitter).
 */
export interface FrameScheduler {
  /** Schedules `callback` for the next frame and returns a handle for `cancel`. */
  request(callback: (timeMs: number) => void): number;
  /** Cancels a scheduled callback; unknown or already-run handles are ignored. */
  cancel(handle: number): void;
}

/** A scheduler on top of `requestAnimationFrame`. */
export function createAnimationFrameScheduler(
  host: Pick<Window, 'requestAnimationFrame' | 'cancelAnimationFrame'>,
): FrameScheduler {
  return {
    request: (callback) => host.requestAnimationFrame(callback),
    cancel: (handle) => {
      host.cancelAnimationFrame(handle);
    },
  };
}

/** A scheduler whose frames run only when a test or the snapshot harness calls `runFrame`. */
export interface ManualScheduler extends FrameScheduler {
  /**
   * Runs every callback scheduled before this call with `timeMs`, as one display frame; callbacks
   * requested meanwhile wait for the next frame. Returns whether any callback ran.
   */
  runFrame(timeMs: number): boolean;
  /** Number of callbacks waiting for the next frame. */
  readonly pendingCount: number;
}

/** Callbacks waiting for the next manual frame, by handle. */
type PendingCallbacks = Map<number, (timeMs: number) => void>;

/**
 * Runs the callbacks pending at the start of a frame; one cancelled meanwhile is skipped, and every
 * error is rethrown after all callbacks ran (several as one AggregateError). Returns whether any ran.
 */
function runPending(pending: PendingCallbacks, timeMs: number): boolean {
  const errors: unknown[] = [];
  let ranCount = 0;
  for (const handle of [...pending.keys()]) {
    const callback = pending.get(handle);
    if (callback === undefined) {
      continue;
    }
    pending.delete(handle);
    ranCount += 1;
    try {
      callback(timeMs);
    } catch (error: unknown) {
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    throw errors.length === 1 ? errors[0] : new AggregateError(errors, 'frame callbacks failed');
  }
  return ranCount > 0;
}

/**
 * Creates a manual scheduler (tests, snapshot harness). Like requestAnimationFrame, a callback
 * cancelled during a frame does not run, and an error in one callback does not stop the others: the
 * error is rethrown once the frame is complete (several as one AggregateError).
 */
export function createManualScheduler(): ManualScheduler {
  const pending: PendingCallbacks = new Map();
  let nextHandle = 1;
  return {
    request(callback: (timeMs: number) => void): number {
      const handle = nextHandle;
      nextHandle += 1;
      pending.set(handle, callback);
      return handle;
    },
    cancel(handle: number): void {
      pending.delete(handle);
    },
    runFrame: (timeMs: number): boolean => runPending(pending, timeMs),
    get pendingCount(): number {
      return pending.size;
    },
  };
}
