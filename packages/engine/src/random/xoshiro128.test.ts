import { expect, test } from 'vitest';
import {
  closeRng,
  nextChance,
  nextFloat,
  nextInt,
  nextUint32,
  openRng,
  pickOne,
  seedRng,
} from './xoshiro128.ts';

test('seedRng expands the seed with splitmix32', () => {
  expect(seedRng(42)).toEqual({ a: 939911724, b: 3948730756, c: 321366731, d: 3317318717 });
  expect(Object.isFrozen(seedRng(42))).toBe(true);
  expect(seedRng(42 + 2 ** 32)).toEqual(seedRng(42));
});

test('nextUint32 matches the xoshiro128** reference sequence', () => {
  const cursor = openRng({ a: 1, b: 2, c: 3, d: 4 });
  const outputs = Array.from({ length: 6 }, () => nextUint32(cursor));
  expect(outputs).toEqual([11520, 0, 5927040, 70819200, 2031721883, 1637235492]);
});

test('open and close copy the state, so snapshots never change', () => {
  const state = seedRng(7);
  const cursor = openRng(state);
  nextUint32(cursor);
  const next = closeRng(cursor);
  expect(state).toEqual(seedRng(7));
  expect(next).not.toEqual(state);
  expect(Object.isFrozen(next)).toBe(true);
  for (const word of Object.values(next)) {
    expect(Number.isInteger(word) && word >= 0 && word < 2 ** 32).toBe(true);
  }
});

test('nextFloat uses the top 24 bits and stays in [0, 1)', () => {
  const reference = openRng(seedRng(3));
  const cursor = openRng(seedRng(3));
  for (let index = 0; index < 1000; index += 1) {
    const value = nextFloat(cursor);
    expect(value).toBe((nextUint32(reference) >>> 8) / 16_777_216);
    expect(value >= 0 && value < 1).toBe(true);
    expect(Number.isInteger(value * 16_777_216)).toBe(true);
  }
});

test('nextInt stays in range and covers it evenly', () => {
  const cursor = openRng(seedRng(11));
  const counts = [0, 0, 0];
  for (let index = 0; index < 30_000; index += 1) {
    const value = nextInt(cursor, 3);
    counts[value] = (counts[value] ?? 0) + 1;
  }
  expect(counts).toHaveLength(3);
  for (const count of counts) {
    expect(Math.abs(count - 10_000)).toBeLessThan(400);
  }
  expect(nextInt(cursor, 1)).toBe(0);
});

test('nextInt rejects outputs above the largest multiple and draws again', () => {
  const max = 2 ** 31 + 1;
  const limit = 2 ** 32 - (2 ** 32 % max);
  const reference = openRng(seedRng(5));
  const cursor = openRng(seedRng(5));
  for (let index = 0; index < 50; index += 1) {
    let raw = nextUint32(reference);
    while (raw >= limit) {
      raw = nextUint32(reference);
    }
    expect(nextInt(cursor, max)).toBe(raw % max);
  }
  expect(closeRng(cursor)).toEqual(closeRng(reference));
});

test('nextInt accepts 2^32 and returns the raw output', () => {
  const reference = openRng(seedRng(9));
  const cursor = openRng(seedRng(9));
  expect(nextInt(cursor, 2 ** 32)).toBe(nextUint32(reference));
});

test('nextInt rejects bounds outside 1…2^32', () => {
  const cursor = openRng(seedRng(1));
  for (const bound of [0, -3, 2.5, 2 ** 32 + 1, Number.NaN]) {
    expect(() => nextInt(cursor, bound)).toThrow(RangeError);
  }
});

test('nextChance compares the next float with the probability', () => {
  const cursor = openRng(seedRng(13));
  for (let index = 0; index < 100; index += 1) {
    expect(nextChance(cursor, 0)).toBe(false);
    expect(nextChance(cursor, 1)).toBe(true);
  }
  const reference = openRng(seedRng(13));
  const probe = openRng(seedRng(13));
  expect(nextChance(probe, 0.5)).toBe(nextFloat(reference) < 0.5);
});

test('pickOne picks by nextInt and rejects an empty list', () => {
  const items = ['bug', 'golden', 'bomb'] as const;
  const reference = openRng(seedRng(17));
  const cursor = openRng(seedRng(17));
  for (let index = 0; index < 20; index += 1) {
    expect(pickOne(cursor, items)).toBe(items[nextInt(reference, items.length)]);
  }
  expect(() => pickOne(cursor, [])).toThrow('empty');
});
