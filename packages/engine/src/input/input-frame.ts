import type { Point } from '../math/geometry.ts';
import { ACTIONS } from './actions.ts';
import type { Action, InputDevice, PointerKind, Shortcut } from './actions.ts';

/** State of one action in this frame. */
export interface ActionState {
  readonly isHeld: boolean;
  /** Press edge this frame. */
  readonly wasPressed: boolean;
  readonly wasReleased: boolean;
  /** Navigation pulses this frame: press edge plus auto-repeats (up/down/left/right). */
  readonly pulses: number;
}

/** The steering pointer in this frame. */
export interface PointerSnapshot {
  readonly id: number;
  readonly kind: PointerKind;
  /** Logical canvas px (cssToLogical), floored. */
  readonly position: Point;
  /** Where the current press started; undefined while not pressed (a press released within the same poll keeps it). */
  readonly downPosition: Point | undefined;
  readonly isDown: boolean;
  readonly wasPressed: boolean;
  readonly wasReleased: boolean;
}

/** A pointer released this frame (cancelled pointers excluded). */
export interface PointerRelease {
  readonly id: number;
  readonly kind: PointerKind;
  /** Logical. */
  readonly downPosition: Point;
  /** Logical, at release. */
  readonly position: Point;
  readonly durationMs: number;
  /** Largest distance from the down position during the press, CSS px. */
  readonly maxTravelCss: number;
}

/** A release with durationMs ≤ 300 and maxTravelCss ≤ 10 (gameplay). */
export interface Tap {
  readonly position: Point;
  readonly kind: PointerKind;
}

/** Everything the scenes see of the input in one frame. */
export interface InputFrame {
  readonly actions: Readonly<Record<Action, ActionState>>;
  /** The steering pointer. */
  readonly pointer: PointerSnapshot | undefined;
  /** Menus activate on these (no duration limit). */
  readonly releases: readonly PointerRelease[];
  /** Gameplay taps. */
  readonly taps: readonly Tap[];
  /** Logical canvas x of the steering pointer if it moved or was pressed this frame (mouse: hover moves too). */
  readonly moveTarget: number | undefined;
  /** Vertical wheel scroll this frame in logical px, down positive. */
  readonly wheelDelta: number;
  /** Printable characters, upper-cased, only while text entry is on. */
  readonly typedChars: readonly string[];
  readonly lastDevice: InputDevice;
  readonly shortcuts: readonly Shortcut[];
  readonly hadActivity: boolean;
}

/** The state of an action without any input. */
const IDLE_ACTION: ActionState = {
  isHeld: false,
  wasPressed: false,
  wasReleased: false,
  pulses: 0,
};

/** Every action idle (shared and immutable). */
const IDLE_ACTIONS = Object.freeze(
  Object.fromEntries(ACTIONS.map((action) => [action, IDLE_ACTION])) as Record<Action, ActionState>,
);

/** An input frame without any input (default device 'keyboard'; tests and transitions). */
export function createIdleInputFrame(lastDevice: InputDevice = 'keyboard'): InputFrame {
  return {
    actions: IDLE_ACTIONS,
    pointer: undefined,
    releases: [],
    taps: [],
    moveTarget: undefined,
    wheelDelta: 0,
    typedChars: [],
    lastDevice,
    shortcuts: [],
    hadActivity: false,
  };
}
