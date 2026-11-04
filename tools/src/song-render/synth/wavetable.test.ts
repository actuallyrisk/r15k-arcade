import { expect, test } from 'vitest';
import { renderOscillator } from './oscillator.ts';
import {
  pulseTable,
  readTable,
  sawtoothTable,
  squareTable,
  triangleTable,
  WAVETABLE_SIZE,
} from './wavetable.ts';

/** Largest absolute value of a table. */
const peak = (table: Float64Array): number => Math.max(...table.map((value) => Math.abs(value)));

/** Share of a table's samples above zero. */
const positiveShare = (table: Float64Array): number =>
  table.filter((value) => value > 0).length / table.length;

test('every table holds one period, normalised to a peak of 1', () => {
  for (const table of [
    pulseTable(0.25),
    pulseTable(0.125),
    triangleTable(),
    sawtoothTable(),
    squareTable(440),
  ]) {
    expect(table).toHaveLength(WAVETABLE_SIZE);
    expect(peak(table)).toBeCloseTo(1, 12);
  }
});

test('a pulse wave is high for its duty cycle', () => {
  expect(positiveShare(pulseTable(0.25))).toBeCloseTo(0.25, 1);
  expect(positiveShare(pulseTable(0.125))).toBeCloseTo(0.125, 1);
});

test('the triangle rises to its peak at a quarter period and is odd-symmetric', () => {
  const table = triangleTable();
  expect(table[WAVETABLE_SIZE / 4]).toBeCloseTo(1, 12);
  expect(table[(3 * WAVETABLE_SIZE) / 4]).toBeCloseTo(-1, 12);
  expect(table[WAVETABLE_SIZE / 8]).toBeCloseTo(0.5, 1);
});

test('square waves are band-limited per note and cached per harmonic count', () => {
  expect(squareTable(1000)).toBe(squareTable(990));
  expect(squareTable(1000)).not.toBe(squareTable(2000));
  expect(squareTable(30_000)).toBe(squareTable(20_000));
  expect(positiveShare(squareTable(100))).toBeCloseTo(0.5, 2);
});

test('reading a table interpolates linearly between neighbouring samples and wraps around', () => {
  const table = triangleTable();
  const first = table[0] ?? 0;
  const second = table[1] ?? 0;
  expect(readTable(table, 0.5 / WAVETABLE_SIZE)).toBeCloseTo((first + second) / 2, 15);
  const last = table[WAVETABLE_SIZE - 1] ?? 0;
  expect(readTable(table, (WAVETABLE_SIZE - 0.5) / WAVETABLE_SIZE)).toBeCloseTo(
    (last + first) / 2,
    15,
  );
});

test('an oscillator accumulates phase from its per-sample frequency', () => {
  const quarter = renderOscillator('sine', new Float64Array(5).fill(12_000), 48_000);
  [0, 1, 0, -1, 0].forEach((value, index) => {
    expect(quarter[index]).toBeCloseTo(value, 12);
  });
  const table = renderOscillator(triangleTable(), new Float64Array(3).fill(12_000), 48_000);
  expect(table[1]).toBeCloseTo(1, 12);
  expect(table[2]).toBeCloseTo(0, 12);
});
