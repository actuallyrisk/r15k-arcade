// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, test } from 'vitest';
import { NAV_REPEAT } from './bindings.ts';
import { createInputHarness } from './test-support/input-harness.ts';
import type { InputHarness } from './test-support/input-harness.ts';

let harness: InputHarness;

beforeEach(() => {
  harness = createInputHarness({ initialDevice: 'touch' });
});

afterEach(() => {
  harness.dispose();
});

test('keyboard actions: a press is an edge in the first poll and held afterwards', () => {
  harness.key('keydown', { code: 'ArrowLeft', key: 'ArrowLeft' });
  const first = harness.manager.poll();
  expect(first.actions.left).toEqual({
    isHeld: true,
    wasPressed: true,
    wasReleased: false,
    pulses: 1,
  });
  expect(first.lastDevice).toBe('keyboard');
  expect(first.hadActivity).toBe(true);
  const second = harness.manager.poll();
  expect(second.actions.left).toEqual({
    isHeld: true,
    wasPressed: false,
    wasReleased: false,
    pulses: 0,
  });
  expect(second.hadActivity).toBe(false);
  harness.key('keyup', { code: 'ArrowLeft', key: 'ArrowLeft' });
  expect(harness.manager.poll().actions.left.wasReleased).toBe(true);
});

test('keyboard actions: a press and release within one poll is pressed and released', () => {
  harness.key('keydown', { code: 'Enter', key: 'Enter' });
  harness.key('keyup', { code: 'Enter', key: 'Enter' });
  const frame = harness.manager.poll();
  expect(frame.actions.confirm).toEqual({
    isHeld: false,
    wasPressed: true,
    wasReleased: true,
    pulses: 1,
  });
});

test('keyboard actions: one code may map to several actions (Escape: back and pause)', () => {
  harness.key('keydown', { code: 'Escape', key: 'Escape' });
  const frame = harness.manager.poll();
  expect(frame.actions.back.wasPressed).toBe(true);
  expect(frame.actions.pause.wasPressed).toBe(true);
});

test('keyboard actions: a key held by two codes is released only when both are up', () => {
  harness.key('keydown', { code: 'ArrowLeft', key: 'ArrowLeft' });
  harness.key('keydown', { code: 'KeyA', key: 'a' });
  harness.manager.poll();
  harness.key('keyup', { code: 'ArrowLeft', key: 'ArrowLeft' });
  expect(harness.manager.poll().actions.left).toMatchObject({ isHeld: true, wasReleased: false });
  harness.key('keyup', { code: 'KeyA', key: 'a' });
  expect(harness.manager.poll().actions.left).toMatchObject({ isHeld: false, wasReleased: true });
});

test('keyboard actions: bound keys without modifiers are prevented on keydown and keyup', () => {
  expect(harness.key('keydown', { code: 'Space', key: ' ' }).defaultPrevented).toBe(true);
  expect(harness.key('keyup', { code: 'Space', key: ' ' }).defaultPrevented).toBe(true);
  expect(harness.key('keydown', { code: 'Tab', key: 'Tab' }).defaultPrevented).toBe(false);
  const withCtrl = harness.key('keydown', { code: 'KeyA', key: 'a', ctrlKey: true });
  expect(withCtrl.defaultPrevented).toBe(false);
  expect(harness.key('keyup', { code: 'KeyA', key: 'a', metaKey: true }).defaultPrevented).toBe(
    false,
  );
  expect(harness.manager.poll().actions.left.wasPressed).toBe(false);
});

test('keyboard actions: any keydown sets the last device, including Tab', () => {
  harness.key('keydown', { code: 'Tab', key: 'Tab' });
  expect(harness.manager.poll().lastDevice).toBe('keyboard');
});

test('keyboard actions: hardware repeats are ignored, except for a key that blur dropped', () => {
  harness.key('keydown', { code: 'ArrowUp', key: 'ArrowUp' });
  harness.manager.poll();
  harness.key('keydown', { code: 'ArrowUp', key: 'ArrowUp', repeat: true });
  expect(harness.manager.poll().actions.up.wasPressed).toBe(false);
  window.dispatchEvent(new Event('blur'));
  expect(harness.manager.poll().actions.up).toMatchObject({ isHeld: false, wasReleased: true });
  harness.key('keydown', { code: 'ArrowUp', key: 'ArrowUp', repeat: true });
  expect(harness.manager.poll().actions.up).toMatchObject({ isHeld: true, wasPressed: true });
});

test('keyboard actions: unbound keys and stray keyups produce no action', () => {
  harness.key('keydown', { code: 'KeyQ', key: 'q' });
  harness.key('keyup', { code: 'KeyZ', key: 'z' });
  const frame = harness.manager.poll();
  expect(Object.values(frame.actions).some((state) => state.isHeld || state.wasPressed)).toBe(
    false,
  );
});

test('keyboard actions: setBindings replaces the codes', () => {
  harness.manager.setBindings({
    keyboard: { ...harnessBindings(), confirm: ['KeyQ'] },
    gamepad: { left: [], right: [], up: [], down: [], confirm: [], back: [], pause: [] },
  });
  harness.key('keydown', { code: 'KeyQ', key: 'q' });
  harness.key('keydown', { code: 'Enter', key: 'Enter' });
  const frame = harness.manager.poll();
  expect(frame.actions.confirm.pulses).toBe(1);
});

/** Keyboard bindings without any code (each test adds what it needs). */
function harnessBindings(): Record<'left' | 'right' | 'up' | 'down' | 'back' | 'pause', string[]> {
  return { left: [], right: [], up: [], down: [], back: [], pause: [] };
}

test('navigation repeat: pulses after the initial delay, then every interval', () => {
  harness.key('keydown', { code: 'ArrowDown', key: 'ArrowDown' });
  expect(harness.manager.poll().actions.down.pulses).toBe(1);
  harness.clock.advance(NAV_REPEAT.initialDelayMs - 1);
  expect(harness.manager.poll().actions.down.pulses).toBe(0);
  harness.clock.advance(1);
  expect(harness.manager.poll().actions.down.pulses).toBe(1);
  harness.clock.advance(NAV_REPEAT.intervalMs * 3);
  expect(harness.manager.poll().actions.down.pulses).toBe(3);
  harness.key('keyup', { code: 'ArrowDown', key: 'ArrowDown' });
  harness.clock.advance(NAV_REPEAT.intervalMs * 3);
  expect(harness.manager.poll().actions.down.pulses).toBe(0);
});

test('navigation repeat: confirm never repeats', () => {
  harness.key('keydown', { code: 'Enter', key: 'Enter' });
  harness.manager.poll();
  harness.clock.advance(1000);
  expect(harness.manager.poll().actions.confirm.pulses).toBe(0);
});

test('navigation repeat: a press counts from its event time, not from the poll', () => {
  harness.key('keydown', { code: 'ArrowRight', key: 'ArrowRight' });
  harness.clock.advance(NAV_REPEAT.initialDelayMs);
  expect(harness.manager.poll().actions.right.pulses).toBe(2);
});

test('text entry: letters and digits are typed, upper-cased, and produce no action', () => {
  harness.manager.setTextEntry(true);
  harness.key('keydown', { code: 'KeyW', key: 'w' });
  harness.key('keydown', { code: 'Digit7', key: '7' });
  harness.key('keydown', { code: 'Numpad3', key: '3' });
  harness.key('keydown', { code: 'KeyA', key: 'a', repeat: true });
  const frame = harness.manager.poll();
  expect(frame.typedChars).toEqual(['W', '7', '3']);
  expect(frame.actions.up.wasPressed).toBe(false);
  expect(frame.actions.left.wasPressed).toBe(false);
  expect(harness.manager.poll().typedChars).toEqual([]);
});

test('text entry: Backspace means left and never back; Escape keeps back', () => {
  harness.manager.setTextEntry(true);
  harness.key('keydown', { code: 'Backspace', key: 'Backspace' });
  const frame = harness.manager.poll();
  expect(frame.actions.left).toMatchObject({ isHeld: true, wasPressed: true, pulses: 1 });
  expect(frame.actions.back.wasPressed).toBe(false);
  harness.clock.advance(NAV_REPEAT.initialDelayMs);
  expect(harness.manager.poll().actions.left.pulses).toBe(1);
  harness.key('keyup', { code: 'Backspace', key: 'Backspace' });
  harness.key('keydown', { code: 'Escape', key: 'Escape' });
  expect(harness.manager.poll().actions.back.wasPressed).toBe(true);
});

test('text entry: arrows, Enter and Space keep their actions; off again restores letters', () => {
  harness.manager.setTextEntry(true);
  harness.key('keydown', { code: 'Space', key: ' ' });
  expect(harness.manager.poll().actions.confirm.wasPressed).toBe(true);
  harness.manager.setTextEntry(false);
  harness.key('keydown', { code: 'KeyD', key: 'd' });
  const frame = harness.manager.poll();
  expect(frame.actions.right.wasPressed).toBe(true);
  expect(frame.typedChars).toEqual([]);
});

test('injected actions and shortcuts: injectAction delivers one press and release in the next poll', () => {
  harness.manager.injectAction('back');
  const frame = harness.manager.poll();
  expect(frame.actions.back).toEqual({
    isHeld: false,
    wasPressed: true,
    wasReleased: true,
    pulses: 1,
  });
  expect(frame.hadActivity).toBe(true);
  expect(harness.manager.poll().actions.back.wasPressed).toBe(false);
});

test('injected actions and shortcuts: F11 is the fullscreen shortcut only when enabled', () => {
  expect(harness.key('keydown', { code: 'F11', key: 'F11' }).defaultPrevented).toBe(false);
  expect(harness.manager.poll().shortcuts).toEqual([]);
  harness.dispose();
  harness = createInputHarness({ isFullscreenShortcutEnabled: true });
  expect(harness.key('keydown', { code: 'F11', key: 'F11' }).defaultPrevented).toBe(true);
  harness.key('keydown', { code: 'F11', key: 'F11', repeat: true });
  expect(harness.manager.poll().shortcuts).toEqual(['toggle-fullscreen']);
});
