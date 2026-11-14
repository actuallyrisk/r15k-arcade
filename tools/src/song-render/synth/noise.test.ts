import { expect, test } from 'vitest';
import { noiseSamples } from './noise.ts';

test('noise is the same for the same key and different for another key', () => {
  const first = noiseSamples('meow-house:12:h', 1000);
  expect(noiseSamples('meow-house:12:h', 1000)).toEqual(first);
  expect(noiseSamples('meow-house:13:h', 1000)).not.toEqual(first);
});

test('a longer burst starts with the samples of a shorter one', () => {
  expect(noiseSamples('key', 2000).subarray(0, 500)).toEqual(noiseSamples('key', 500));
});

test('noise is uniform in [−1, 1) with a mean near zero', () => {
  const samples = noiseSamples('uniform', 48_000);
  expect(samples.every((value) => value >= -1 && value < 1)).toBe(true);
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  expect(Math.abs(mean)).toBeLessThan(0.02);
  expect(samples.filter((value) => value > 0.5).length / samples.length).toBeCloseTo(0.25, 1);
});
