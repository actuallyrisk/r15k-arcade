import { expect, test } from 'vitest';
import { applyGain, guardClipping, mixInto, peakOf, scaleSignal } from './mix-buffer.ts';

test('voices are added at their offset and cut at the end of the mix', () => {
  const mix = new Float64Array([1, 1, 1, 1]);
  mixInto(mix, new Float64Array([0.5, 0.25, 0.125]), 2);
  expect([...mix]).toEqual([1, 1, 1.5, 1.25]);
  mixInto(mix, new Float64Array([9]), 4);
  expect([...mix]).toEqual([1, 1, 1.5, 1.25]);
});

test('gains multiply sample by sample or by a constant', () => {
  expect([...applyGain(new Float64Array([1, 2, 3]), new Float64Array([0.5, 0, 2]))]).toEqual([
    0.5, 0, 6,
  ]);
  expect([...scaleSignal(new Float64Array([1, -2]), 0.42)]).toEqual([0.42, -0.84]);
});

test('the clip guard clamps to ±0.999 and converts to float32', () => {
  const signal = new Float64Array(20_000).fill(0.25);
  signal[3] = 1.5;
  signal[4] = -2;
  const { pcm, clippedSamples } = guardClipping(signal, 'test');
  expect(clippedSamples).toBe(2);
  expect(pcm[3]).toBe(Math.fround(0.999));
  expect(pcm[4]).toBe(Math.fround(-0.999));
  expect(pcm[5]).toBe(0.25);
  expect(peakOf(pcm)).toBe(Math.fround(0.999));
});

test('a render that clips more than 0.01 % of its samples fails', () => {
  const signal = new Float64Array(20_000);
  signal.fill(1, 0, 3);
  expect(() => guardClipping(signal, 'loud')).toThrow('loud: 3 of 20000 samples clip');
});
