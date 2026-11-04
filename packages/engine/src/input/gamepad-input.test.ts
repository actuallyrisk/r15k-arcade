// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createInputHarness } from './test-support/input-harness.ts';
import type { InputHarness } from './test-support/input-harness.ts';

/** Pressed button indices and axis values of one stubbed standard gamepad. */
interface PadState {
  readonly pressed: readonly number[];
  readonly axes?: readonly number[];
}

let harness: InputHarness;
let pads: (PadState | null)[] = [];

/** A Gamepad-shaped object for `navigator.getGamepads()`. */
function gamepadOf(state: PadState, index: number): Gamepad {
  const buttons = Array.from({ length: 17 }, (_unused, button) => {
    const value = state.pressed.includes(button) ? 1 : 0;
    return { pressed: value > 0, touched: value > 0, value };
  });
  const axes = state.axes ?? [0, 0, 0, 0];
  return { index, connected: true, buttons, axes, mapping: 'standard' } as unknown as Gamepad;
}

function gamepadEvent(type: string, index: number): Event {
  return Object.assign(new Event(type), { gamepad: { index } });
}

beforeEach(() => {
  pads = [];
  Object.defineProperty(window.navigator, 'getGamepads', {
    configurable: true,
    value: () => pads.map((state, index) => (state === null ? null : gamepadOf(state, index))),
  });
  harness = createInputHarness();
});

afterEach(() => {
  harness.dispose();
  Reflect.deleteProperty(window.navigator, 'getGamepads');
});

test('gamepads: buttons and axes map to actions and set the last device', () => {
  pads = [null, { pressed: [0], axes: [-0.8, 0.2, 0, 0] }];
  const frame = harness.manager.poll();
  expect(frame.actions.confirm).toMatchObject({ isHeld: true, wasPressed: true });
  expect(frame.actions.left).toMatchObject({ isHeld: true, wasPressed: true });
  expect(frame.actions.down.isHeld).toBe(false);
  expect(frame.lastDevice).toBe('gamepad');
  expect(frame.hadActivity).toBe(true);
  pads = [null, { pressed: [] }];
  const released = harness.manager.poll();
  expect(released.actions.confirm).toMatchObject({ isHeld: false, wasReleased: true });
  expect(released.hadActivity).toBe(true);
  expect(harness.manager.poll().hadActivity).toBe(false);
});

test('gamepads: a button edge notifies onGamepadButton once per poll', () => {
  const listener = vi.fn();
  harness.manager.onGamepadButton(listener);
  pads = [{ pressed: [3, 4] }];
  harness.manager.poll();
  harness.manager.poll();
  expect(listener).toHaveBeenCalledTimes(1);
});

test('gamepads: the D-pad repeats like the keyboard', () => {
  pads = [{ pressed: [13] }];
  expect(harness.manager.poll().actions.down.pulses).toBe(1);
  harness.clock.advance(350);
  expect(harness.manager.poll().actions.down.pulses).toBe(1);
});

test('gamepads: connect and disconnect events drive isGamepadConnected and the listeners', () => {
  const activity = vi.fn();
  const disconnected = vi.fn();
  harness.manager.onActivity(activity);
  harness.manager.onGamepadDisconnected(disconnected);
  expect(harness.manager.isGamepadConnected).toBe(false);
  window.dispatchEvent(gamepadEvent('gamepadconnected', 0));
  expect(harness.manager.isGamepadConnected).toBe(true);
  expect(activity).toHaveBeenCalledTimes(1);
  window.dispatchEvent(gamepadEvent('gamepaddisconnected', 0));
  expect(harness.manager.isGamepadConnected).toBe(false);
  expect(disconnected).toHaveBeenCalledTimes(1);
});

test('gamepads: a pad found by polling counts as connected; no Gamepad API means no pads', () => {
  pads = [{ pressed: [] }];
  harness.manager.poll();
  expect(harness.manager.isGamepadConnected).toBe(true);
  Reflect.deleteProperty(window.navigator, 'getGamepads');
  expect(harness.manager.poll().actions.confirm.isHeld).toBe(false);
});

test('activity and user activation: every DOM input event notifies onActivity', () => {
  const activity = vi.fn();
  harness.manager.onActivity(activity);
  harness.key('keydown', { code: 'KeyQ', key: 'q' });
  harness.key('keyup', { code: 'KeyQ', key: 'q' });
  harness.pointer('pointerdown', { clientX: 1, clientY: 1 });
  harness.surface.dispatchEvent(new WheelEvent('wheel', { deltaY: 1 }));
  expect(activity).toHaveBeenCalledTimes(4);
});

test('activity and user activation: activation fires for keydown, mouse pointerdown, touch pointerup and click only', () => {
  const activation = vi.fn();
  const stop = harness.manager.onUserActivation(activation);
  harness.pointer('pointerdown', { pointerType: 'touch', clientX: 1, clientY: 1 });
  harness.key('keydown', { code: 'Escape', key: 'Escape' });
  expect(activation).not.toHaveBeenCalled();
  harness.pointer('pointerup', { pointerType: 'touch', clientX: 1, clientY: 1 });
  harness.pointer('pointerdown', { pointerType: 'mouse', clientX: 1, clientY: 1 });
  harness.pointer('pointerup', { pointerType: 'mouse', clientX: 1, clientY: 1 });
  harness.key('keydown', { code: 'KeyQ', key: 'q' });
  document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  document.body.dispatchEvent(new Event('touchend', { bubbles: true }));
  expect(activation).toHaveBeenCalledTimes(5);
  stop();
  harness.key('keydown', { code: 'KeyQ', key: 'q' });
  expect(activation).toHaveBeenCalledTimes(5);
});

test('activity and user activation: dispose removes every listener', () => {
  const activity = vi.fn();
  harness.manager.onActivity(activity);
  harness.manager.dispose();
  harness.key('keydown', { code: 'Enter', key: 'Enter' });
  harness.pointer('pointerdown', { clientX: 1, clientY: 1 });
  window.dispatchEvent(gamepadEvent('gamepadconnected', 0));
  expect(activity).not.toHaveBeenCalled();
  expect(harness.manager.poll().actions.confirm.wasPressed).toBe(false);
});
