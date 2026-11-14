// R15K Arcade – test helpers of the UI package: input frames, menu inputs and widgets.
import { createDrawTarget, createFramebuffer, createIdleInputFrame } from '@r15k/engine';
import type {
  Action,
  ActionState,
  DrawTarget,
  InputFrame,
  Point,
  PointerRelease,
  PointerSnapshot,
  Rect,
  TextChoice,
} from '@r15k/engine';
import type { MenuInput } from '../focus/menu-reducer.ts';
import type {
  ButtonWidget,
  InitialsWidget,
  SelectorWidget,
  SliderWidget,
  ToggleWidget,
} from '../widgets/widget-types.ts';

/** The menu text of the desktop layout. */
export const TEXT: TextChoice = { font: 'r15k-8', zoom: 1 };

/** A fresh 200 × 120 draw target. */
export function makeTarget(): DrawTarget {
  return createDrawTarget(createFramebuffer({ width: 200, height: 120 }));
}

/** An action pressed once this frame. */
const PRESSED: ActionState = { isHeld: true, wasPressed: true, wasReleased: false, pulses: 1 };

/** An idle frame with some actions pressed once. */
export function keys(...pressed: readonly Action[]): InputFrame {
  const idle = createIdleInputFrame();
  const actions = { ...idle.actions };
  for (const action of pressed) {
    actions[action] = PRESSED;
  }
  return { ...idle, actions };
}

/** A pointer snapshot. */
export function pointer(
  position: Point,
  state: { readonly down?: Point; readonly isDown: boolean; readonly wasPressed: boolean },
): PointerSnapshot {
  return {
    id: 1,
    kind: 'touch',
    position,
    downPosition: state.down ?? position,
    isDown: state.isDown,
    wasPressed: state.wasPressed,
    wasReleased: !state.isDown,
  };
}

/** A release of pointer 1. */
export function release(down: Point, position: Point, durationMs = 100): PointerRelease {
  return { id: 1, kind: 'touch', downPosition: down, position, durationMs, maxTravelCss: 0 };
}

/** A menu input around a frame. */
export function menuInput(frame: InputFrame, overrides: Partial<MenuInput> = {}): MenuInput {
  return {
    frame,
    minTouchTarget: 14,
    text: TEXT,
    cssPerLogical: 3.5,
    scrollRegion: undefined,
    moreIndicators: { above: undefined, below: undefined },
    ...overrides,
  };
}

/** A row rect. */
export function row(y: number, width = 160): Rect {
  return { x: 10, y, width, height: 16 };
}

/** A secondary button. */
export function makeButton(id: string, rect: Rect = row(0, 60)): ButtonWidget {
  return {
    kind: 'button',
    id,
    rect,
    label: id,
    isDisabled: false,
    variant: 'secondary',
    icon: undefined,
  };
}

/** A toggle row. */
export function makeToggle(id: string, rect: Rect = row(20)): ToggleWidget {
  return {
    kind: 'toggle',
    id,
    rect,
    label: 'Mute',
    isDisabled: false,
    isOn: false,
    onText: 'On',
    offText: 'Off',
  };
}

/** A 0…100 slider row in steps of 10. */
export function makeSlider(id: string, rect: Rect = row(40)): SliderWidget {
  return {
    ...{ kind: 'slider', id, rect, label: 'Music', isDisabled: false },
    ...{ value: 50, min: 0, max: 100, step: 10, valueText: '50 %' },
  };
}

/** A selector row with three options. */
export function makeSelector(id: string, rect: Rect = row(60)): SelectorWidget {
  const options = [
    { id: 'system', label: 'System' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
  ];
  return {
    kind: 'selector',
    id,
    rect,
    label: 'Theme',
    isDisabled: false,
    options,
    selectedId: 'system',
  };
}

/** Initials with the cursor on the first letter. */
export function makeInitials(
  id: string,
  rect: Rect = { x: 10, y: 10, width: 72, height: 46 },
): InitialsWidget {
  return {
    kind: 'initials',
    id,
    rect,
    label: 'Initials',
    isDisabled: false,
    letters: 'AAA',
    cursor: 0,
  };
}
