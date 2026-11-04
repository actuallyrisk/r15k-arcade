import { expect, test } from 'vitest';
import {
  automate,
  exponentialRampTo,
  linearRampTo,
  paramValueAt,
  renderParam,
  setValueAt,
} from './param-automation.ts';

test('before the first event the default value holds, a set value holds until the next event', () => {
  const timeline = automate(440, [setValueAt(220, 0.5), setValueAt(110, 1)]);
  expect(paramValueAt(timeline, 0.25)).toBe(440);
  expect(paramValueAt(timeline, 0.5)).toBe(220);
  expect(paramValueAt(timeline, 0.99)).toBe(220);
  expect(paramValueAt(timeline, 5)).toBe(110);
});

test('a linear ramp runs from the previous event to its own and then holds', () => {
  const timeline = automate(1, [setValueAt(0, 1), linearRampTo(1, 3)]);
  expect(paramValueAt(timeline, 1)).toBe(0);
  expect(paramValueAt(timeline, 1.5)).toBe(0.25);
  expect(paramValueAt(timeline, 2)).toBe(0.5);
  expect(paramValueAt(timeline, 3)).toBe(1);
  expect(paramValueAt(timeline, 10)).toBe(1);
});

test('an exponential ramp follows v0 · (v1 / v0) ^ ((t − t0) / (t1 − t0))', () => {
  const timeline = automate(1, [setValueAt(100, 0), exponentialRampTo(400, 2)]);
  expect(paramValueAt(timeline, 1)).toBeCloseTo(200, 10);
  expect(paramValueAt(timeline, 0.5)).toBeCloseTo(100 * Math.SQRT2, 10);
  expect(paramValueAt(timeline, 2)).toBe(400);
});

test('an exponential ramp between values of different sign holds its start value', () => {
  const timeline = automate(1, [setValueAt(-1, 0), exponentialRampTo(1, 1)]);
  expect(paramValueAt(timeline, 0.5)).toBe(-1);
});

test('a ramp after a ramp starts where the previous one ended; a ramp without a start uses the default', () => {
  const chained = automate(0, [setValueAt(0, 0), linearRampTo(1, 1), linearRampTo(0, 2)]);
  expect(paramValueAt(chained, 1.5)).toBe(0.5);
  const unanchored = automate(2, [linearRampTo(4, 2)]);
  expect(paramValueAt(unanchored, 1)).toBe(3);
});

test('events are ordered by time; at the same time the later event wins', () => {
  const timeline = automate(0, [
    setValueAt(5, 2),
    setValueAt(1, 0),
    setValueAt(2, 1),
    setValueAt(3, 1),
  ]);
  expect(timeline.events.map((event) => event.value)).toEqual([1, 2, 3, 5]);
  expect(paramValueAt(timeline, 1)).toBe(3);
});

test('rendered values sample the timeline at n / sampleRate', () => {
  const timeline = automate(0, [setValueAt(0.0001, 0), linearRampTo(0.15, 0.004)]);
  const values = renderParam(timeline, 400, 48_000);
  expect(values[0]).toBe(0.0001);
  expect(values[96]).toBeCloseTo(0.0001 + (0.15 - 0.0001) * 0.5, 12);
  expect(values[192]).toBeCloseTo(0.15, 12);
  expect(values[399]).toBe(0.15);
  expect([...values]).toEqual(
    Array.from({ length: 400 }, (_, n) => paramValueAt(timeline, n / 48_000)),
  );
});
