import type { Point } from '../math/geometry.ts';
import { notImplemented } from '../util/assert.ts';
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

/** An input frame without any input (default device 'keyboard'; tests and transitions). */
export function createIdleInputFrame(_lastDevice?: InputDevice): InputFrame {
  return notImplemented('engine.createIdleInputFrame');
}
