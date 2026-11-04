import { expect, test } from 'vitest';
import { createEntropySeed } from './entropy.ts';

test('the seed is the little-endian uint32 of four random bytes', () => {
  const source = {
    getRandomValues<T extends ArrayBufferView | null>(array: T): T {
      if (array instanceof Uint8Array) {
        array.set([0x01, 0x02, 0x03, 0xf4]);
      }
      return array;
    },
  };
  expect(createEntropySeed(source)).toBe(0xf4030201);
});

test('the default source is the platform crypto', () => {
  const seeds = new Set(Array.from({ length: 8 }, () => createEntropySeed()));
  for (const seed of seeds) {
    expect(Number.isInteger(seed) && seed >= 0 && seed < 2 ** 32).toBe(true);
  }
  expect(seeds.size).toBeGreaterThan(1);
});
