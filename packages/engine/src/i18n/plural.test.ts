import { expect, test } from 'vitest';
import { pluralCategory } from './plural.ts';

test.each([
  [1, 'one'],
  [0, 'other'],
  [2, 'other'],
  [1.5, 'other'],
  [-1, 'other'],
] as const)('pluralCategory(%d) is %j in both locales', (count, category) => {
  expect(pluralCategory('de', count)).toBe(category);
  expect(pluralCategory('en', count)).toBe(category);
});
