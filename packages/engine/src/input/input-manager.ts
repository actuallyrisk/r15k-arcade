import type { Point } from '../math/geometry.ts';
import type { Clock } from '../time/clock.ts';
import { notImplemented } from '../util/assert.ts';
import type { Unsubscribe } from '../util/emitter.ts';
import type { Action, InputDevice } from './actions.ts';
import type { Bindings } from './bindings.ts';
import type { InputFrame } from './input-frame.ts';

/** What the input manager listens to and how it converts coordinates. */
export interface InputManagerOptions {
  readonly window: Window;
  /** Stage element receiving pointer events (touch-action: none). */
  readonly surface: HTMLElement;
  readonly clock: Clock;
  readonly bindings: Bindings;
  readonly toLogical: (cssPoint: Point) => Point | undefined;
  /** Current k, for wheel deltas. */
  readonly cssPerLogical: () => number;
  /** detectInitialDevice(). */
  readonly initialDevice: InputDevice;
  /** F11 → 'toggle-fullscreen' (Tauri on Windows/Linux). */
  readonly isFullscreenShortcutEnabled: boolean;
}

/** Collects keyboard, pointer, wheel and gamepad input into one InputFrame per display frame. */
export class InputManager {
  constructor(_options: InputManagerOptions) {
    return notImplemented('engine.InputManager.constructor');
  }

  /** Samples all sources once per frame (gamepads via navigator.getGamepads()). */
  poll(): InputFrame {
    return notImplemented('engine.InputManager.poll');
  }

  /** Replaces the bindings. */
  setBindings(_bindings: Bindings): void {
    return notImplemented('engine.InputManager.setBindings');
  }

  /** While on, letter and digit keys produce typedChars instead of actions (initials entry). */
  setTextEntry(_isOn: boolean): void {
    return notImplemented('engine.InputManager.setTextEntry');
  }

  /** Delivers a press and release of `action` in the next poll (platform back button). */
  injectAction(_action: Action): void {
    return notImplemented('engine.InputManager.injectAction');
  }

  /** Any DOM input event (wakes the loop). */
  onActivity(_listener: () => void): Unsubscribe {
    return notImplemented('engine.InputManager.onActivity');
  }

  /** Every activation-granting event, called synchronously inside the DOM handler (audio unlock). */
  onUserActivation(_listener: () => void): Unsubscribe {
    return notImplemented('engine.InputManager.onUserActivation');
  }

  /** A gamepad button edge seen in poll(). */
  onGamepadButton(_listener: () => void): Unsubscribe {
    return notImplemented('engine.InputManager.onGamepadButton');
  }

  /** A gamepad was disconnected. */
  onGamepadDisconnected(_listener: () => void): Unsubscribe {
    return notImplemented('engine.InputManager.onGamepadDisconnected');
  }

  /** The app keeps the loop alive while true (polling). */
  get isGamepadConnected(): boolean {
    return notImplemented('engine.InputManager.isGamepadConnected');
  }

  /** Removes every listener. */
  dispose(): void {
    return notImplemented('engine.InputManager.dispose');
  }
}
