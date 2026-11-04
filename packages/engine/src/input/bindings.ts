import { notImplemented } from '../util/assert.ts';
import type { Result } from '../util/result.ts';
import type { Action } from './actions.ts';

/** A gamepad button of the standard mapping. */
export interface GamepadButtonControl {
  readonly kind: 'button';
  readonly index: number;
}

/** One direction of a gamepad axis of the standard mapping. */
export interface GamepadAxisControl {
  readonly kind: 'axis';
  readonly index: number;
  readonly direction: -1 | 1;
}

/** A gamepad button or axis direction. */
export type GamepadControl = GamepadButtonControl | GamepadAxisControl;

/** Keyboard codes and gamepad controls per action. */
export interface Bindings {
  /** KeyboardEvent.code values. */
  readonly keyboard: Readonly<Record<Action, readonly string[]>>;
  /** Standard mapping indices. */
  readonly gamepad: Readonly<Record<Action, readonly GamepadControl[]>>;
}

/** Default bindings: arrows and WASD, Enter/Space, Escape/Backspace, P; D-pad, stick, A, B, Start. */
export const DEFAULT_BINDINGS: Bindings = {
  keyboard: {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    confirm: ['Enter', 'NumpadEnter', 'Space'],
    back: ['Escape', 'Backspace'],
    pause: ['KeyP', 'Escape'],
  },
  gamepad: {
    left: [
      { kind: 'button', index: 14 },
      { kind: 'axis', index: 0, direction: -1 },
    ],
    right: [
      { kind: 'button', index: 15 },
      { kind: 'axis', index: 0, direction: 1 },
    ],
    up: [
      { kind: 'button', index: 12 },
      { kind: 'axis', index: 1, direction: -1 },
    ],
    down: [
      { kind: 'button', index: 13 },
      { kind: 'axis', index: 1, direction: 1 },
    ],
    confirm: [{ kind: 'button', index: 0 }],
    back: [{ kind: 'button', index: 1 }],
    pause: [{ kind: 'button', index: 9 }],
  },
};

/** Validates stored bindings; the error lists every problem. */
export function validateBindings(_value: unknown): Result<Bindings, readonly string[]> {
  return notImplemented('engine.validateBindings');
}

/** Auto-repeat of held navigation actions (keyboard and gamepad alike). */
export const NAV_REPEAT = { initialDelayMs: 350, intervalMs: 80 } as const;

/** A gamepad axis counts as pressed beyond this magnitude. */
export const GAMEPAD_AXIS_THRESHOLD = 0.5;

/** Longest press that still counts as a gameplay tap, in milliseconds. */
export const TAP_MAX_DURATION_MS = 300;

/** Largest travel of a gameplay tap in CSS px (≈ Android touch slop 8 dp plus margin), independent of the scale. */
export const TAP_MAX_TRAVEL_CSS = 10;
