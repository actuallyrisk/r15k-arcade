import type { Point } from '../math/geometry.ts';
import type { Clock } from '../time/clock.ts';
import { createEmitter } from '../util/emitter.ts';
import type { Unsubscribe } from '../util/emitter.ts';
import { ACTIONS } from './actions.ts';
import type { Action, InputDevice } from './actions.ts';
import type { Bindings } from './bindings.ts';
import { GamepadSource } from './gamepad-source.ts';
import type { ActionState, InputFrame } from './input-frame.ts';
import { KeyboardSource } from './keyboard-source.ts';
import type { KeyboardDrain } from './keyboard-source.ts';
import { createNavRepeat } from './nav-repeat.ts';
import { PointerSource } from './pointer-source.ts';

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

/** Events that grant transient user activation in HTML, so audio may start inside their handlers. */
const ACTIVATION_EVENTS = ['keydown', 'mousedown', 'pointerdown', 'pointerup', 'touchend', 'click'];

/** Whether `event` grants user activation (Escape and touch/pen pointerdown do not). */
function isActivation(event: Event): boolean {
  if (event.type === 'keydown') {
    return (event as KeyboardEvent).key !== 'Escape';
  }
  if (event.type === 'pointerdown' || event.type === 'pointerup') {
    const isMouse = (event as PointerEvent).pointerType === 'mouse';
    return event.type === 'pointerdown' ? isMouse : !isMouse;
  }
  return true;
}

/** The inputs of one action that its state is computed from. */
interface ActionInputs {
  readonly isHeld: boolean;
  readonly wasHeld: boolean;
  readonly pressCount: number;
  readonly pressedAtMs: number | undefined;
  readonly isReleaseSeen: boolean;
}

/** Collects keyboard, pointer, wheel and gamepad input into one InputFrame per display frame. */
export class InputManager {
  private readonly options: InputManagerOptions;
  private readonly keyboard: KeyboardSource;
  private readonly pointers: PointerSource;
  private readonly gamepads: GamepadSource;
  private readonly navRepeat = createNavRepeat();
  private readonly activity = createEmitter<undefined>();
  private readonly activation = createEmitter<undefined>();
  private readonly gamepadButton = createEmitter<undefined>();
  private readonly gamepadDisconnected = createEmitter<undefined>();
  private readonly removeActivationListener: () => void;
  private bindings: Bindings;
  private heldBefore: ReadonlySet<Action> = new Set();
  private injected: Action[] = [];
  private lastDevice: InputDevice;
  private hadActivity = false;

  constructor(options: InputManagerOptions) {
    this.options = options;
    this.bindings = options.bindings;
    this.lastDevice = options.initialDevice;
    this.keyboard = new KeyboardSource({
      window: options.window,
      clock: options.clock,
      bindings: options.bindings,
      isFullscreenShortcutEnabled: options.isFullscreenShortcutEnabled,
      onKeyEvent: (isPress) => {
        this.noteInput(isPress ? 'keyboard' : undefined);
      },
    });
    this.pointers = new PointerSource({
      surface: options.surface,
      clock: options.clock,
      toLogical: options.toLogical,
      cssPerLogical: options.cssPerLogical,
      onPointerEvent: (device) => {
        this.noteInput(device);
      },
    });
    this.gamepads = new GamepadSource({
      window: options.window,
      onConnected: () => {
        this.noteInput(undefined);
      },
      onDisconnected: () => {
        this.gamepadDisconnected.emit(undefined);
      },
    });
    this.removeActivationListener = this.listenForActivation();
  }

  /** The app keeps the loop alive while true (polling). */
  get isGamepadConnected(): boolean {
    return this.gamepads.isConnected;
  }

  /** Samples all sources once per frame (gamepads via navigator.getGamepads()). */
  poll(): InputFrame {
    const nowMs = this.options.clock.now();
    const keys = this.keyboard.drain();
    const pads = this.gamepads.sample(this.bindings);
    if (pads.hadButtonEdge) {
      this.gamepadButton.emit(undefined);
    }
    if (pads.hadChange) {
      this.lastDevice = 'gamepad';
      this.hadActivity = true;
    }
    const held = new Set([...keys.held, ...pads.held]);
    const actions = this.actionStates(keys, held, nowMs);
    const frame: InputFrame = {
      actions,
      ...this.pointers.drain(),
      typedChars: keys.typedChars,
      lastDevice: this.lastDevice,
      shortcuts: keys.shortcuts,
      hadActivity: this.hadActivity,
    };
    this.heldBefore = held;
    this.injected = [];
    this.hadActivity = false;
    return frame;
  }

  /** Replaces the bindings. */
  setBindings(bindings: Bindings): void {
    this.bindings = bindings;
    this.keyboard.setBindings(bindings);
  }

  /** While on, letter and digit keys produce typedChars instead of actions (initials entry). */
  setTextEntry(isOn: boolean): void {
    this.keyboard.setTextEntry(isOn);
  }

  /** Delivers a press and release of `action` in the next poll (platform back button). */
  injectAction(action: Action): void {
    this.injected.push(action);
    this.hadActivity = true;
  }

  /** Any DOM input event (wakes the loop). */
  onActivity(listener: () => void): Unsubscribe {
    return this.activity.subscribe(listener);
  }

  /** Every activation-granting event, called synchronously inside the DOM handler (audio unlock). */
  onUserActivation(listener: () => void): Unsubscribe {
    return this.activation.subscribe(listener);
  }

  /** A gamepad button edge seen in poll(). */
  onGamepadButton(listener: () => void): Unsubscribe {
    return this.gamepadButton.subscribe(listener);
  }

  /** A gamepad was disconnected. */
  onGamepadDisconnected(listener: () => void): Unsubscribe {
    return this.gamepadDisconnected.subscribe(listener);
  }

  /** Removes every listener. */
  dispose(): void {
    this.keyboard.dispose();
    this.pointers.dispose();
    this.gamepads.dispose();
    this.removeActivationListener();
    for (const emitter of [
      this.activity,
      this.activation,
      this.gamepadButton,
      this.gamepadDisconnected,
    ]) {
      emitter.clear();
    }
  }

  /** Records a DOM input event; presses and moves also set the last device. */
  private noteInput(device: InputDevice | undefined): void {
    if (device !== undefined) {
      this.lastDevice = device;
    }
    this.hadActivity = true;
    this.activity.emit(undefined);
  }

  /** Capture-phase listeners on the window, so the accessibility mirror's buttons are covered too. */
  private listenForActivation(): () => void {
    const { window } = this.options;
    const onEvent = (event: Event): void => {
      if (isActivation(event)) {
        this.activation.emit(undefined);
      }
    };
    for (const type of ACTIVATION_EVENTS) {
      window.addEventListener(type, onEvent, { capture: true });
    }
    return () => {
      for (const type of ACTIVATION_EVENTS) {
        window.removeEventListener(type, onEvent, { capture: true });
      }
    };
  }

  private actionStates(
    keys: KeyboardDrain,
    held: ReadonlySet<Action>,
    nowMs: number,
  ): Record<Action, ActionState> {
    const entries = ACTIONS.map((action): [Action, ActionState] => {
      const presses = keys.presses.get(action);
      const injectedCount = this.injected.filter((injected) => injected === action).length;
      const inputs: ActionInputs = {
        isHeld: held.has(action),
        wasHeld: this.heldBefore.has(action),
        pressCount: (presses?.count ?? 0) + injectedCount,
        pressedAtMs: presses?.lastAtMs,
        isReleaseSeen: keys.releases.has(action) || injectedCount > 0,
      };
      return [action, this.actionState(action, inputs, nowMs)];
    });
    return Object.fromEntries(entries) as Record<Action, ActionState>;
  }

  private actionState(action: Action, inputs: ActionInputs, nowMs: number): ActionState {
    const wasPressed = inputs.pressCount > 0 || (inputs.isHeld && !inputs.wasHeld);
    const pressedAtMs = inputs.pressedAtMs ?? (wasPressed ? nowMs : undefined);
    const repeats = this.navRepeat.repeats({ action, isHeld: inputs.isHeld, pressedAtMs, nowMs });
    return {
      isHeld: inputs.isHeld,
      wasPressed,
      wasReleased: inputs.isReleaseSeen || (inputs.wasHeld && !inputs.isHeld),
      pulses: Math.max(inputs.pressCount, wasPressed ? 1 : 0) + repeats,
    };
  }
}
