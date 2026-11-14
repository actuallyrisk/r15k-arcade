// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, test } from 'vitest';
import { TAP_MAX_DURATION_MS } from './bindings.ts';
import { HARNESS_K, createInputHarness } from './test-support/input-harness.ts';
import type { InputHarness } from './test-support/input-harness.ts';

let harness: InputHarness;

beforeEach(() => {
  harness = createInputHarness();
});

afterEach(() => {
  harness.dispose();
});

test('steering pointer: a touch press steers, sets moveTarget and keeps its down position', () => {
  harness.pointer('pointerdown', { pointerId: 5, clientX: 20, clientY: 40 });
  const frame = harness.manager.poll();
  expect(frame.pointer).toEqual({
    id: 5,
    kind: 'touch',
    position: { x: 10, y: 20 },
    downPosition: { x: 10, y: 20 },
    isDown: true,
    wasPressed: true,
    wasReleased: false,
  });
  expect(frame.moveTarget).toBe(10);
  expect(frame.lastDevice).toBe('touch');
  const idle = harness.manager.poll();
  expect(idle.pointer).toMatchObject({ isDown: true, wasPressed: false });
  expect(idle.moveTarget).toBeUndefined();
  harness.pointer('pointermove', { pointerId: 5, clientX: 30, clientY: 40 });
  expect(harness.manager.poll().moveTarget).toBe(15);
});

test('steering pointer: a press and release within one poll steers once, with one release and one tap', () => {
  harness.pointer('pointerdown', { pointerId: 2, clientX: 40, clientY: 10 });
  harness.clock.advance(50);
  harness.pointer('pointerup', { pointerId: 2, clientX: 42, clientY: 10 });
  const frame = harness.manager.poll();
  expect(frame.pointer).toEqual({
    id: 2,
    kind: 'touch',
    position: { x: 21, y: 5 },
    downPosition: { x: 20, y: 5 },
    isDown: false,
    wasPressed: true,
    wasReleased: true,
  });
  expect(frame.moveTarget).toBe(21);
  expect(frame.releases).toEqual([
    {
      id: 2,
      kind: 'touch',
      downPosition: { x: 20, y: 5 },
      position: { x: 21, y: 5 },
      durationMs: 50,
      maxTravelCss: 2,
    },
  ]);
  expect(frame.taps).toEqual([{ position: { x: 21, y: 5 }, kind: 'touch' }]);
  const next = harness.manager.poll();
  expect(next.pointer).toBeUndefined();
  expect(next.releases).toEqual([]);
});

test('steering pointer: the newest active pointer takes over when the steering pointer is released', () => {
  harness.pointer('pointerdown', { pointerId: 1, clientX: 10, clientY: 10 });
  harness.manager.poll();
  harness.pointer('pointerdown', { pointerId: 2, clientX: 100, clientY: 10 });
  expect(harness.manager.poll().pointer?.id).toBe(2);
  harness.pointer('pointerup', { pointerId: 2, clientX: 100, clientY: 10 });
  const frame = harness.manager.poll();
  expect(frame.pointer).toMatchObject({
    id: 1,
    downPosition: { x: 5, y: 5 },
    isDown: true,
    wasPressed: false,
  });
  expect(frame.moveTarget).toBeUndefined();
  expect(frame.releases.map((release) => release.id)).toEqual([2]);
});

test('steering pointer: a released steering pointer shows its release for one frame', () => {
  harness.pointer('pointerdown', { pointerId: 3, clientX: 10, clientY: 10 });
  harness.manager.poll();
  harness.pointer('pointerup', { pointerId: 3, clientX: 10, clientY: 10 });
  expect(harness.manager.poll().pointer).toMatchObject({
    id: 3,
    isDown: false,
    wasPressed: false,
    wasReleased: true,
    downPosition: undefined,
  });
  expect(harness.manager.poll().pointer).toBeUndefined();
});

test('steering pointer: a hovering mouse steers and sets moveTarget only when it moves', () => {
  harness.pointer('pointermove', { pointerType: 'mouse', clientX: 60, clientY: 8 });
  const frame = harness.manager.poll();
  expect(frame.pointer).toMatchObject({ kind: 'mouse', isDown: false, position: { x: 30, y: 4 } });
  expect(frame.moveTarget).toBe(30);
  expect(frame.lastDevice).toBe('mouse');
  expect(harness.manager.poll().moveTarget).toBeUndefined();
  harness.pointer('pointerleave', { pointerType: 'mouse' });
  expect(harness.manager.poll().pointer).toBeUndefined();
});

test('steering pointer: a mouse press, drag and release, then hover again', () => {
  harness.pointer('pointerdown', { pointerType: 'mouse', clientX: 10, clientY: 10 });
  harness.manager.poll();
  harness.pointer('pointermove', { pointerType: 'mouse', clientX: 50, clientY: 10 });
  expect(harness.manager.poll()).toMatchObject({ moveTarget: 25, pointer: { isDown: true } });
  harness.pointer('pointerup', { pointerType: 'mouse', clientX: 50, clientY: 10 });
  const released = harness.manager.poll();
  expect(released.releases[0]?.maxTravelCss).toBe(40);
  expect(released.taps).toEqual([]);
  expect(harness.manager.poll().pointer).toMatchObject({ kind: 'mouse', isDown: false });
});

test('steering pointer: pen and touch moves without a press are ignored; other buttons do not press', () => {
  harness.pointer('pointermove', { pointerType: 'pen', clientX: 10, clientY: 10 });
  harness.pointer('pointerdown', { pointerType: 'mouse', button: 2, clientX: 10, clientY: 10 });
  harness.pointer('pointerdown', { pointerId: 9, clientX: -4, clientY: 10 });
  const frame = harness.manager.poll();
  expect(frame.pointer).toBeUndefined();
  expect(frame.moveTarget).toBeUndefined();
});

test('releases and taps: a long press is a release but no tap; travel is measured in CSS px', () => {
  harness.pointer('pointerdown', { pointerId: 4, clientX: 0, clientY: 0 });
  harness.clock.advance(TAP_MAX_DURATION_MS + 1);
  harness.pointer('pointerup', { pointerId: 4, clientX: 6, clientY: 8 });
  const frame = harness.manager.poll();
  expect(frame.releases[0]).toMatchObject({ durationMs: 301, maxTravelCss: 10 });
  expect(frame.taps).toEqual([]);
});

test('releases and taps: a press that travelled more than 10 CSS px is no tap', () => {
  harness.pointer('pointerdown', { pointerId: 4, clientX: 0, clientY: 0 });
  harness.pointer('pointermove', { pointerId: 4, clientX: 0, clientY: 11 });
  harness.pointer('pointerup', { pointerId: 4, clientX: 0, clientY: 0 });
  const frame = harness.manager.poll();
  expect(frame.releases[0]?.maxTravelCss).toBe(11);
  expect(frame.taps).toEqual([]);
});

test('releases and taps: pointercancel and lostpointercapture end a pointer without release or tap', () => {
  harness.pointer('pointerdown', { pointerId: 6, clientX: 10, clientY: 10 });
  harness.pointer('pointercancel', { pointerId: 6 });
  harness.pointer('pointerdown', { pointerId: 7, clientX: 10, clientY: 10 });
  harness.manager.poll();
  harness.pointer('lostpointercapture', { pointerId: 7 });
  harness.pointer('pointerup', { pointerId: 7, clientX: 10, clientY: 10 });
  const frame = harness.manager.poll();
  expect(frame.pointer).toBeUndefined();
  expect(frame.releases).toEqual([]);
  expect(frame.taps).toEqual([]);
});

test('releases and taps: the context menu is prevented on the stage', () => {
  const event = new MouseEvent('contextmenu', { cancelable: true });
  harness.surface.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
});

test('wheel: pixels, lines and pages convert to logical px and are prevented', () => {
  const pixels = new WheelEvent('wheel', { deltaY: 8, deltaMode: 0, cancelable: true });
  harness.surface.dispatchEvent(pixels);
  harness.surface.dispatchEvent(new WheelEvent('wheel', { deltaY: -1, deltaMode: 1 }));
  expect(pixels.defaultPrevented).toBe(true);
  expect(harness.manager.poll().wheelDelta).toBe((8 - 16) / HARNESS_K);
  harness.surface.getBoundingClientRect = () => new DOMRect(0, 0, 100, 300);
  harness.surface.dispatchEvent(new WheelEvent('wheel', { deltaY: 1, deltaMode: 2 }));
  expect(harness.manager.poll().wheelDelta).toBe(300 / HARNESS_K);
  expect(harness.manager.poll().wheelDelta).toBe(0);
});
