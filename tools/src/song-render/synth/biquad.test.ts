import { expect, test } from 'vitest';
import { applyBiquad, biquadCoefficients } from './biquad.ts';
import type { BiquadSettings } from './biquad.ts';

const RATE = 48_000;

/** Gain of a filter at DC: (b0 + b1 + b2) / (1 + a1 + a2). */
const dcGain = (settings: BiquadSettings, frequencyHz: number): number => {
  const { b0, b1, b2, a1, a2 } = biquadCoefficients(settings, frequencyHz);
  return (b0 + b1 + b2) / (1 + a1 + a2);
};

test('lowpass coefficients follow the Web Audio formulas with Q in dB', () => {
  // f0 = 12 kHz at 48 kHz: ω0 = π/2, cos ω0 = 0, sin ω0 = 1; Q = 0 dB → α = 1/2, a0 = 3/2.
  const coefficients = biquadCoefficients({ type: 'lowpass', q: 0, sampleRate: RATE }, 12_000);
  expect(coefficients.b0).toBeCloseTo(1 / 3, 12);
  expect(coefficients.b1).toBeCloseTo(2 / 3, 12);
  expect(coefficients.b2).toBeCloseTo(1 / 3, 12);
  expect(coefficients.a1).toBeCloseTo(0, 12);
  expect(coefficients.a2).toBeCloseTo(1 / 3, 12);
});

test('highpass coefficients mirror the lowpass, Q 20 dB means a linear Q of 10', () => {
  const coefficients = biquadCoefficients({ type: 'highpass', q: 20, sampleRate: RATE }, 12_000);
  // α = 1 / (2 · 10) = 0.05, a0 = 1.05.
  expect(coefficients.b0).toBeCloseTo(0.5 / 1.05, 12);
  expect(coefficients.b1).toBeCloseTo(-1 / 1.05, 12);
  expect(coefficients.b2).toBeCloseTo(0.5 / 1.05, 12);
  expect(coefficients.a2).toBeCloseTo(0.95 / 1.05, 12);
});

test('bandpass coefficients take a linear Q and have unit gain at the centre', () => {
  const coefficients = biquadCoefficients({ type: 'bandpass', q: 2.5, sampleRate: RATE }, 12_000);
  // α = 1 / (2 · 2.5) = 0.2, a0 = 1.2.
  expect(coefficients.b0).toBeCloseTo(0.2 / 1.2, 12);
  expect(coefficients.b1).toBe(0);
  expect(coefficients.b2).toBeCloseTo(-0.2 / 1.2, 12);
  expect(coefficients.a2).toBeCloseTo(0.8 / 1.2, 12);
});

test('lowpass passes DC, highpass and bandpass block it', () => {
  expect(dcGain({ type: 'lowpass', q: 0.8, sampleRate: RATE }, 20_000)).toBeCloseTo(1, 12);
  expect(dcGain({ type: 'highpass', q: 1, sampleRate: RATE }, 7000)).toBeCloseTo(0, 12);
  expect(dcGain({ type: 'bandpass', q: 1, sampleRate: RATE }, 1800)).toBeCloseTo(0, 12);
});

test('a cutoff above Nyquist is clamped to Nyquist', () => {
  const settings: BiquadSettings = { type: 'lowpass', q: 1, sampleRate: RATE };
  expect(biquadCoefficients(settings, 30_000)).toEqual(biquadCoefficients(settings, 24_000));
});

test('filtering a constant settles at the DC gain; a per-sample cutoff equal to a fixed one gives the same output', () => {
  const settings: BiquadSettings = { type: 'lowpass', q: 0.8, sampleRate: RATE };
  const input = new Float64Array(2000).fill(1);
  const fixed = applyBiquad(input, settings, 1000);
  expect(fixed[1999]).toBeCloseTo(1, 9);
  expect(applyBiquad(input, settings, new Float64Array(2000).fill(1000))).toEqual(fixed);
});
