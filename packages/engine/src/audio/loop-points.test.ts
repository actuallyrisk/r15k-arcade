import { expect, test } from 'vitest';
import type { MusicMetadata } from './audio-types.ts';
import { resolveLoopPoints } from './loop-points.ts';
import type { DecodedTrackInfo } from './loop-points.ts';

/** Meow House as rendered: 48 kHz, loop of 1 486 452 samples after a 0.5 s lead-in, onset at 3000. */
const METADATA: MusicMetadata = {
  format: 'r15k-music',
  version: 1,
  id: 'meow-house',
  file: 'music/meow-house.mp3',
  sampleRate: 48_000,
  channels: 1,
  bitrateKbps: 96,
  pcmLength: 1_558_452,
  loopStartSample: 24_000,
  loopEndSample: 1_510_452,
  onsetSample: 3000,
  encoder: { name: 'lame', delaySamples: 1105, paddingSamples: 595, frames: 1354 },
  inputHash: '0123abcd',
};

/** A decoded track of `seconds` at `sampleRate` whose first loud sample is at `onset`. */
function decodedTrack(
  seconds: number,
  sampleRate: number,
  onset: number | undefined,
): DecodedTrackInfo {
  const channel0 = new Float32Array(Math.round(seconds * sampleRate));
  channel0.fill(0.01);
  if (onset !== undefined) {
    channel0[onset] = -0.2;
  }
  return { durationSeconds: seconds, sampleRate, channel0 };
}

const EXPECTED_SECONDS = METADATA.pcmLength / METADATA.sampleRate;
const LOOP_START = 24_000 / 48_000;
const LOOP_END = 1_510_452 / 48_000;

test('a decoder that trimmed delay and padding needs no offset', () => {
  const points = resolveLoopPoints(decodedTrack(EXPECTED_SECONDS + 0.0015, 48_000, 9000), METADATA);
  expect(points).toEqual({
    offsetSeconds: 0,
    loopStartSeconds: LOOP_START,
    loopEndSeconds: LOOP_END,
  });
});

test('an untrimmed decode with the nominal 1105-sample delay is offset by exactly that delay', () => {
  const decoded = decodedTrack((METADATA.pcmLength + 1105 + 595) / 48_000, 48_000, 3000 + 1105);
  const points = resolveLoopPoints(decoded, METADATA);
  expect(points.offsetSeconds).toBeCloseTo(1105 / 48_000, 9);
  expect(points.loopStartSeconds).toBeCloseTo(LOOP_START + 1105 / 48_000, 9);
  expect(points.loopEndSeconds).toBeCloseTo(LOOP_END + 1105 / 48_000, 9);
});

test('a decode resampled to 44.1 kHz compares seconds, so the offset stays within one sample', () => {
  const onset = Math.round((3000 / 48_000 + 1105 / 48_000) * 44_100);
  const decoded = decodedTrack(EXPECTED_SECONDS + 0.05, 44_100, onset);
  const points = resolveLoopPoints(decoded, METADATA);
  expect(Math.abs(points.offsetSeconds - 1105 / 48_000)).toBeLessThan(1 / 44_100);
});

test('an implausible offset is clamped to 0 … 0.1 s', () => {
  const late = resolveLoopPoints(decodedTrack(EXPECTED_SECONDS + 1, 48_000, 30_000), METADATA);
  expect(late.offsetSeconds).toBe(0.1);
  const early = resolveLoopPoints(decodedTrack(EXPECTED_SECONDS + 1, 48_000, 10), METADATA);
  expect(early.offsetSeconds).toBe(0);
});

test('an untrimmed decode without any onset keeps the offset at 0', () => {
  const points = resolveLoopPoints(decodedTrack(EXPECTED_SECONDS + 1, 48_000, undefined), METADATA);
  expect(points.offsetSeconds).toBe(0);
  expect(points.loopStartSeconds).toBe(LOOP_START);
});
