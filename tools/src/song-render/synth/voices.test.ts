import { expect, test } from 'vitest';
import { peakOf } from './mix-buffer.ts';
import { renderDrum, renderSung, renderTone } from './voices.ts';
import { pulseTable, triangleTable } from './wavetable.ts';

const RATE = 48_000;

test('a tone lasts its duration plus 20 ms and follows the attack, decay, hold and release envelope', () => {
  const tone = renderTone(
    { shape: 'sine', frequencyHz: 12_000, durationSeconds: 0.1, volume: 0.2 },
    RATE,
  );
  expect(tone).toHaveLength(Math.round(0.12 * RATE));
  // Sample 1 of a 12 kHz sine is its peak; the gain there is 0.0001 + (0.2 − 0.0001) · (1 / 192).
  expect(tone[1]).toBeCloseTo(0.0001 + (0.2 - 0.0001) / 192, 12);
  // 4 ms in: full volume (sample 193 is a positive peak of the sine).
  expect(tone[193]).toBeCloseTo(0.2 - (0.2 - 0.13) * (1 / RATE / 0.056), 9);
  // Hold at 65 % from 60 ms to 85 ms, then the release; after 100 ms the gain stays at 0.0001.
  expect(tone[Math.round(0.07 * RATE) + 1]).toBeCloseTo(0.13, 12);
  expect(peakOf(tone.subarray(Math.round(0.1 * RATE)))).toBeLessThanOrEqual(0.0001);
});

test('the kick lasts 180 ms; drum tokens combine their parts', () => {
  const kick = renderDrum('k', 'test:0:k', RATE);
  expect(kick).toHaveLength(Math.round(0.18 * RATE));
  expect(peakOf(kick)).toBeGreaterThan(0.45);
  expect(peakOf(kick)).toBeLessThanOrEqual(0.55);
  const hat = renderDrum('h', 'test:0:h', RATE);
  expect(hat).toHaveLength(Math.round(0.055 * RATE));
  const both = renderDrum('x', 'test:0:h', RATE);
  expect(both).toHaveLength(kick.length);
  expect(both.subarray(0, hat.length)).toEqual(
    kick.subarray(0, hat.length).map((value, index) => value + (hat[index] ?? 0)),
  );
  expect(renderDrum('o', 'test:0:o', RATE)).toHaveLength(Math.round(0.2 * RATE));
  expect(renderDrum('s', 'test:0:s', RATE)).toHaveLength(Math.round(0.16 * RATE));
});

test('a drum hit sounds the same for the same noise key', () => {
  expect(renderDrum('s', 'song:4:s', RATE)).toEqual(renderDrum('s', 'song:4:s', RATE));
  expect(renderDrum('s', 'song:5:s', RATE)).not.toEqual(renderDrum('s', 'song:4:s', RATE));
});

test('a sung note lasts at least 160 ms and fades in and out', () => {
  const short = renderSung({ frequencyHz: 523.25, durationSeconds: 0.12, volume: 0.26 }, RATE);
  expect(short).toHaveLength(Math.round(0.18 * RATE));
  const long = renderSung({ frequencyHz: 523.25, durationSeconds: 0.48, volume: 0.26 }, RATE);
  expect(long).toHaveLength(Math.round(0.5 * RATE));
  expect(peakOf(long.subarray(0, 24))).toBeLessThan(0.01);
  expect(peakOf(long)).toBeGreaterThan(0.05);
  expect(peakOf(long.subarray(Math.round(0.48 * RATE)))).toBeLessThan(0.001);
});

test('pulse and triangle tones peak near their volume', () => {
  for (const shape of [pulseTable(0.25), pulseTable(0.125), triangleTable()]) {
    const tone = renderTone({ shape, frequencyHz: 440, durationSeconds: 0.2, volume: 0.15 }, RATE);
    expect(peakOf(tone)).toBeGreaterThan(0.1);
    expect(peakOf(tone)).toBeLessThanOrEqual(0.15);
  }
});
