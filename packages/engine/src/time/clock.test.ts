import { expect, test } from 'vitest';
import { createFakeClock, createSystemClock } from './clock.ts';

test('the system clock reads performance.now and Date.now', () => {
  const clock = createSystemClock();
  const before = Date.now();
  const first = clock.now();
  const wall = clock.wallTimeMs();
  expect(clock.now()).toBeGreaterThanOrEqual(first);
  expect(wall).toBeGreaterThanOrEqual(before);
  expect(wall).toBeLessThanOrEqual(Date.now());
});

test('a fake clock starts at its defaults', () => {
  const clock = createFakeClock();
  expect(clock.now()).toBe(0);
  expect(clock.wallTimeMs()).toBe(1_793_750_400_000);
  expect(new Date(clock.wallTimeMs()).toISOString()).toBe('2026-11-04T00:00:00.000Z');
});

test('advance moves both clocks, setWallTime only the wall clock', () => {
  const clock = createFakeClock({ startMs: 100, wallTimeMs: 5000 });
  clock.advance(16.5);
  expect(clock.now()).toBe(116.5);
  expect(clock.wallTimeMs()).toBe(5016.5);
  clock.setWallTime(42);
  expect(clock.now()).toBe(116.5);
  expect(clock.wallTimeMs()).toBe(42);
  clock.advance(0);
  expect(clock.now()).toBe(116.5);
});

test('a monotonic fake clock never runs backwards', () => {
  const clock = createFakeClock();
  for (const step of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    expect(() => {
      clock.advance(step);
    }).toThrow(RangeError);
  }
  expect(clock.now()).toBe(0);
});
