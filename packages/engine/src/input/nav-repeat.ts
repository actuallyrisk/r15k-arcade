// Auto-repeat of held navigation actions, synthesised from the clock for keyboard and gamepad alike
// (hardware key repeats are ignored, so every device repeats at the same rate).
import type { Action } from './actions.ts';
import { NAV_REPEAT } from './bindings.ts';

const NAV_ACTIONS: ReadonlySet<Action> = new Set<Action>(['up', 'down', 'left', 'right']);

/** The state of one action that the repeat timer needs. */
export interface RepeatInput {
  readonly action: Action;
  readonly isHeld: boolean;
  /** Time of the latest press this frame; undefined without a press this frame. */
  readonly pressedAtMs: number | undefined;
  readonly nowMs: number;
}

/** Counts the auto-repeats that are due for held navigation actions. */
export interface NavRepeat {
  /** Repeats due this frame (0 for released and non-navigation actions). */
  repeats(input: RepeatInput): number;
}

/** Creates the repeat timers (initial delay after the press, then a fixed interval). */
export function createNavRepeat(): NavRepeat {
  const nextRepeatAt = new Map<Action, number>();
  return {
    repeats({ action, isHeld, pressedAtMs, nowMs }: RepeatInput): number {
      if (!isHeld || !NAV_ACTIONS.has(action)) {
        nextRepeatAt.delete(action);
        return 0;
      }
      // A press restarts the timer; held without any press seen (the mapping changed while a key was
      // down) starts timing now.
      let due =
        pressedAtMs === undefined
          ? (nextRepeatAt.get(action) ?? nowMs + NAV_REPEAT.initialDelayMs)
          : pressedAtMs + NAV_REPEAT.initialDelayMs;
      let count = 0;
      while (due <= nowMs) {
        count += 1;
        due += NAV_REPEAT.intervalMs;
      }
      nextRepeatAt.set(action, due);
      return count;
    },
  };
}
