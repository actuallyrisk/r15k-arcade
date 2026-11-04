import { expect, test } from 'vitest';
import { applyCompressor, compressorCurveDb, MASTER_COMPRESSOR } from './compressor.ts';

test('below the knee the curve leaves the level alone', () => {
  expect(compressorCurveDb(-40, MASTER_COMPRESSOR)).toBe(-40);
  expect(compressorCurveDb(-21, MASTER_COMPRESSOR)).toBe(-21);
});

test('above the knee the level rises by 1/ratio of the excess over the threshold', () => {
  expect(compressorCurveDb(0, MASTER_COMPRESSOR)).toBe(-12);
  expect(compressorCurveDb(-11, MASTER_COMPRESSOR)).toBeCloseTo(-14.75, 12);
});

test('inside the knee the curve bends quadratically and meets both lines', () => {
  // At the threshold: x + (1/R − 1) · (W/2)² / (2W) = −16 − 0.75 · 25 / 20.
  expect(compressorCurveDb(-16, MASTER_COMPRESSOR)).toBeCloseTo(-16.9375, 12);
  expect(compressorCurveDb(-21 + 1e-9, MASTER_COMPRESSOR)).toBeCloseTo(-21, 6);
  expect(compressorCurveDb(-11 - 1e-9, MASTER_COMPRESSOR)).toBeCloseTo(-14.75, 6);
});

test('silence passes unchanged', () => {
  expect(applyCompressor(new Float64Array(100), MASTER_COMPRESSOR, 48_000)).toEqual(
    new Float64Array(100),
  );
});

test('a quiet signal passes unchanged, a loud one settles at the curve gain', () => {
  const quiet = applyCompressor(new Float64Array(4800).fill(0.01), MASTER_COMPRESSOR, 48_000);
  expect(quiet[4799]).toBeCloseTo(0.01, 12);
  const loud = applyCompressor(new Float64Array(4800).fill(1), MASTER_COMPRESSOR, 48_000);
  expect(loud[4799]).toBeCloseTo(10 ** (-12 / 20), 6);
  // The 3 ms attack lets the first samples through before the detector catches up.
  expect(loud[0]).toBeGreaterThan(0.9);
});
