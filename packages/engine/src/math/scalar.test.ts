import { expect, test } from 'vitest';
import { SIM_STEP_HZ, SIM_STEP_SECONDS } from './fixed-step.ts';
import { approach, clamp, inverseLerp, isNearlyEqual, lerp, triangleWave } from './scalar.ts';

test('clamp limits to the range', () => {
  expect(clamp(5, 0, 10)).toBe(5);
  expect(clamp(-1, 0, 10)).toBe(0);
  expect(clamp(11, 0, 10)).toBe(10);
});

test('lerp and inverseLerp are inverse', () => {
  expect(lerp(10, 20, 0)).toBe(10);
  expect(lerp(10, 20, 0.25)).toBe(12.5);
  expect(lerp(10, 20, 1)).toBe(20);
  expect(inverseLerp(10, 20, 12.5)).toBe(0.25);
  expect(inverseLerp(10, 20, 30)).toBe(2);
  expect(inverseLerp(4, 4, 9)).toBe(0);
});

test('approach moves by at most maxDelta and never overshoots', () => {
  expect(approach(0, 10, 3)).toBe(3);
  expect(approach(9, 10, 3)).toBe(10);
  expect(approach(10, 0, 4)).toBe(6);
  expect(approach(1, 0, 4)).toBe(0);
  expect(approach(5, 5, 1)).toBe(5);
  expect(approach(0, 10, -2)).toBe(0);
});

test('isNearlyEqual compares within epsilon (inclusive)', () => {
  expect(isNearlyEqual(1, 1.05, 0.1)).toBe(true);
  expect(isNearlyEqual(1, 1.5, 0.5)).toBe(true);
  expect(isNearlyEqual(1, 1.6, 0.5)).toBe(false);
});

test('triangleWave rises from 0 to 1 and falls back once per period', () => {
  expect(triangleWave(0, 2)).toBe(0);
  expect(triangleWave(0.5, 2)).toBe(0.5);
  expect(triangleWave(1, 2)).toBe(1);
  expect(triangleWave(1.5, 2)).toBe(0.5);
  expect(triangleWave(2, 2)).toBe(0);
  expect(triangleWave(5, 2)).toBe(1);
  expect(triangleWave(-0.5, 2)).toBe(0.5);
});

test('triangleWave rejects a period that is not positive', () => {
  expect(() => triangleWave(1, 0)).toThrow(RangeError);
  expect(() => triangleWave(1, Number.NaN)).toThrow(RangeError);
});

test('the fixed step is 120 Hz', () => {
  expect(SIM_STEP_HZ).toBe(120);
  expect(SIM_STEP_SECONDS).toBe(1 / 120);
});
