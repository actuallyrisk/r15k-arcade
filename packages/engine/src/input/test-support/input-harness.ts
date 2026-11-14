// Test harness for the input manager: the happy-dom window, a stage element, a fake clock, a fixed
// CSS → logical mapping (k = 2, no offset) and helpers that dispatch real DOM events.
import { createFakeClock } from '../../time/clock.ts';
import type { FakeClock } from '../../time/clock.ts';
import type { InputDevice } from '../actions.ts';
import { DEFAULT_BINDINGS } from '../bindings.ts';
import { InputManager } from '../input-manager.ts';

/** CSS px per logical px of the harness mapping. */
export const HARNESS_K = 2;

/** A manager on a fresh stage plus the means to drive it. */
export interface InputHarness {
  readonly manager: InputManager;
  readonly clock: FakeClock;
  readonly surface: HTMLElement;
  /** Dispatches a keyboard event on the window and returns it (to inspect defaultPrevented). */
  key(type: 'keydown' | 'keyup', init: KeyboardEventInit): KeyboardEvent;
  /** Dispatches a pointer event on the stage at CSS coordinates. */
  pointer(type: string, init: PointerEventInit): PointerEvent;
  dispose(): void;
}

/** Options of the harness. */
export interface HarnessOptions {
  readonly initialDevice?: InputDevice;
  readonly isFullscreenShortcutEnabled?: boolean;
}

/** The harness mapping: CSS px ÷ k, floored; negative coordinates lie outside the canvas. */
function toLogical(point: {
  readonly x: number;
  readonly y: number;
}): { x: number; y: number } | undefined {
  return point.x < 0 || point.y < 0
    ? undefined
    : { x: Math.floor(point.x / HARNESS_K), y: Math.floor(point.y / HARNESS_K) };
}

/** Creates a manager on a new stage element inside `document.body`. */
export function createInputHarness(options: HarnessOptions = {}): InputHarness {
  const clock = createFakeClock();
  const surface = document.createElement('div');
  document.body.append(surface);
  const manager = new InputManager({
    window,
    surface,
    clock,
    bindings: DEFAULT_BINDINGS,
    toLogical,
    cssPerLogical: () => HARNESS_K,
    initialDevice: options.initialDevice ?? 'keyboard',
    isFullscreenShortcutEnabled: options.isFullscreenShortcutEnabled ?? false,
  });
  return {
    manager,
    clock,
    surface,
    key(type, init) {
      const event = new KeyboardEvent(type, { cancelable: true, bubbles: true, ...init });
      window.dispatchEvent(event);
      return event;
    },
    pointer(type, init) {
      const defaults = { cancelable: true, bubbles: true, button: 0, pointerId: 1 };
      const event = new PointerEvent(type, { ...defaults, pointerType: 'touch', ...init });
      surface.dispatchEvent(event);
      return event;
    },
    dispose() {
      manager.dispose();
      surface.remove();
    },
  };
}
