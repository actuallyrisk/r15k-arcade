import { expect, test } from 'vitest';
import { levelToGain } from './volume.ts';

test.each([
  [0, 0],
  [0.5, 0.25],
  [0.7, 0.49],
  [1, 1],
  [1.5, 1],
  [-0.2, 0],
  [Number.NaN, 0],
  [Number.POSITIVE_INFINITY, 1],
])('levelToGain(%d) is %d', (level, gain) => {
  expect(levelToGain(level)).toBeCloseTo(gain, 12);
});
