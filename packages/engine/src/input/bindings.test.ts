// @vitest-environment happy-dom
import { expect, test, vi } from 'vitest';
import { ACTIONS } from './actions.ts';
import { DEFAULT_BINDINGS, validateBindings } from './bindings.ts';
import { detectInitialDevice } from './initial-device.ts';
import { createIdleInputFrame } from './input-frame.ts';

test('validateBindings: the defaults are valid and come back as an equal copy', () => {
  const result = validateBindings(JSON.parse(JSON.stringify(DEFAULT_BINDINGS)));
  expect(result).toEqual({ ok: true, value: DEFAULT_BINDINGS });
});

test('validateBindings: the defaults follow the standard mapping', () => {
  expect(DEFAULT_BINDINGS.keyboard.back).toEqual(['Escape', 'Backspace']);
  expect(DEFAULT_BINDINGS.gamepad.pause).toEqual([{ kind: 'button', index: 9 }]);
});

test('validateBindings: every problem is listed', () => {
  const result = validateBindings({
    keyboard: { ...DEFAULT_BINDINGS.keyboard, left: 'ArrowLeft', jump: ['Space'], up: [''] },
    gamepad: {
      ...DEFAULT_BINDINGS.gamepad,
      confirm: [{ kind: 'button', index: -1 }],
      back: [{ kind: 'axis', index: 0, direction: 2 }],
      pause: [{ kind: 'button', index: 9, direction: 1 }, null],
    },
  });
  expect(result).toEqual({
    ok: false,
    error: [
      'keyboard.jump: unknown action',
      'keyboard.left: expected a list',
      'keyboard.up[0]: invalid entry',
      'gamepad.confirm[0]: invalid entry',
      'gamepad.back[0]: invalid entry',
      'gamepad.pause[0]: invalid entry',
      'gamepad.pause[1]: invalid entry',
    ],
  });
});

test('validateBindings: missing sections and non-objects', () => {
  expect(validateBindings(null)).toEqual({ ok: false, error: ['bindings: expected an object'] });
  const result = validateBindings({ keyboard: [] });
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toContain('keyboard: expected an object');
    expect(result.error).toContain('gamepad: expected an object');
    expect(result.error).toHaveLength(2 + 2 * ACTIONS.length);
  }
});

test('createIdleInputFrame: nothing held, pressed or pointed at', () => {
  const frame = createIdleInputFrame();
  expect(frame.lastDevice).toBe('keyboard');
  expect(Object.keys(frame.actions)).toEqual([...ACTIONS]);
  expect(frame.actions.confirm).toEqual({
    isHeld: false,
    wasPressed: false,
    wasReleased: false,
    pulses: 0,
  });
  expect(frame).toMatchObject({ pointer: undefined, moveTarget: undefined, wheelDelta: 0 });
  expect(createIdleInputFrame('gamepad').lastDevice).toBe('gamepad');
});

test('detectInitialDevice: touch on Android and iOS without asking the media query', () => {
  const matchMedia = vi.spyOn(window, 'matchMedia');
  expect(detectInitialDevice(window, 'android')).toBe('touch');
  expect(detectInitialDevice(window, 'ios')).toBe('touch');
  expect(matchMedia).not.toHaveBeenCalled();
});

test('detectInitialDevice: a coarse pointer means touch, else keyboard', () => {
  const matches = (isCoarse: boolean): MediaQueryList =>
    ({ matches: isCoarse, media: '(pointer: coarse)' }) as MediaQueryList;
  vi.spyOn(window, 'matchMedia').mockReturnValueOnce(matches(true));
  expect(detectInitialDevice(window, 'windows')).toBe('touch');
  vi.spyOn(window, 'matchMedia').mockReturnValueOnce(matches(false));
  expect(detectInitialDevice(window, 'unknown')).toBe('keyboard');
});
