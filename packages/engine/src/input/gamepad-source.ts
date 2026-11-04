// Gamepads, sampled once per poll with navigator.getGamepads() (standard mapping indices), plus the
// connect and disconnect events.
import { ACTIONS } from './actions.ts';
import type { Action } from './actions.ts';
import { GAMEPAD_AXIS_THRESHOLD } from './bindings.ts';
import type { Bindings, GamepadControl } from './bindings.ts';

/** A button counts as pressed above this value (analog triggers included). */
const BUTTON_THRESHOLD = 0.5;

/** One poll of every connected gamepad. */
export interface GamepadSample {
  readonly held: ReadonlySet<Action>;
  /** A button went from released to pressed on any gamepad. */
  readonly hadButtonEdge: boolean;
  /** Any button or bound axis changed (counts as input from the gamepad). */
  readonly hadChange: boolean;
}

/** What the gamepad source needs from the input manager. */
export interface GamepadSourceOptions {
  readonly window: Window;
  readonly onConnected: () => void;
  readonly onDisconnected: () => void;
}

/** `navigator.getGamepads` is missing where the Gamepad API is not exposed (some WebViews, tests). */
interface GamepadNavigator {
  readonly getGamepads?: () => (Gamepad | null)[];
}

function isControlActive(
  pad: Gamepad,
  pressed: readonly boolean[],
  control: GamepadControl,
): boolean {
  if (control.kind === 'button') {
    return pressed[control.index] === true;
  }
  return (pad.axes[control.index] ?? 0) * control.direction > GAMEPAD_AXIS_THRESHOLD;
}

function isSameSet(a: ReadonlySet<Action>, b: ReadonlySet<Action>): boolean {
  return a.size === b.size && [...a].every((action) => b.has(action));
}

/** Gamepad state between two polls. */
export class GamepadSource {
  private readonly options: GamepadSourceOptions;
  private readonly connected = new Set<number>();
  private pressedBefore = new Map<number, readonly boolean[]>();
  private heldBefore: ReadonlySet<Action> = new Set();
  private readonly cleanup: () => void;

  constructor(options: GamepadSourceOptions) {
    this.options = options;
    const { window } = options;
    const onConnected = (event: GamepadEvent): void => {
      this.connected.add(event.gamepad.index);
      options.onConnected();
    };
    const onDisconnected = (event: GamepadEvent): void => {
      this.connected.delete(event.gamepad.index);
      this.pressedBefore.delete(event.gamepad.index);
      options.onDisconnected();
    };
    window.addEventListener('gamepadconnected', onConnected);
    window.addEventListener('gamepaddisconnected', onDisconnected);
    this.cleanup = () => {
      window.removeEventListener('gamepadconnected', onConnected);
      window.removeEventListener('gamepaddisconnected', onDisconnected);
    };
  }

  /** Whether at least one gamepad is connected (the app keeps polling while true). */
  get isConnected(): boolean {
    return this.connected.size > 0;
  }

  /** Samples every connected gamepad. */
  sample(bindings: Bindings): GamepadSample {
    const navigator: GamepadNavigator = this.options.window.navigator;
    const pads = (navigator.getGamepads?.() ?? []).filter(
      (pad): pad is Gamepad => pad?.connected === true,
    );
    const held = new Set<Action>();
    const pressedNow = new Map<number, readonly boolean[]>();
    let hadButtonEdge = false;
    for (const pad of pads) {
      this.connected.add(pad.index);
      const pressed = pad.buttons.map((button) => button.value > BUTTON_THRESHOLD);
      const before = this.pressedBefore.get(pad.index) ?? [];
      hadButtonEdge ||= pressed.some((isPressed, index) => isPressed && before[index] !== true);
      pressedNow.set(pad.index, pressed);
      for (const action of ACTIONS) {
        if (bindings.gamepad[action].some((control) => isControlActive(pad, pressed, control))) {
          held.add(action);
        }
      }
    }
    const hadChange =
      hadButtonEdge || !isSameSet(held, this.heldBefore) || this.hasReleased(pressedNow);
    this.pressedBefore = pressedNow;
    this.heldBefore = held;
    return { held, hadButtonEdge, hadChange };
  }

  /** Removes the listeners. */
  dispose(): void {
    this.cleanup();
  }

  /** Whether a button that was pressed in the previous sample is released now. */
  private hasReleased(pressedNow: ReadonlyMap<number, readonly boolean[]>): boolean {
    return [...this.pressedBefore].some(([index, before]) => {
      const now = pressedNow.get(index) ?? [];
      return before.some((wasPressed, button) => wasPressed && now[button] !== true);
    });
  }
}
