import { expect, test } from 'vitest';
import { CLIP_LIMIT, LOOP_LEAD_IN_SAMPLES, LOOP_TAIL_SAMPLES } from './levels.ts';
import { isPeriodic, loopSampleCount, renderSong } from './render-song.ts';
import type { SongRender } from './render-song.ts';
import { peakOf } from './synth/mix-buffer.ts';
import { channel, meowHouse, section, testSong } from './test-support/songs.ts';

/** One render of Meow House, shared by the tests of this file. */
let shared: SongRender | undefined;
const render = (): SongRender => {
  shared ??= renderSong(meowHouse(), 'meow-house');
  return shared;
};

test('one Meow House loop is 256 steps at 124 bpm: 1 486 452 samples', () => {
  expect(loopSampleCount(meowHouse(), 256)).toBe(1_486_452);
  const { pcm, loopSamples, loopStartSample, loopEndSample } = render();
  expect(loopSamples).toBe(1_486_452);
  expect(pcm).toHaveLength(loopSamples + LOOP_LEAD_IN_SAMPLES + LOOP_TAIL_SAMPLES);
  expect([loopStartSample, loopEndSample]).toEqual([24_000, 24_000 + 1_486_452]);
});

test('around both loop points every sample repeats exactly one loop later', () => {
  const { pcm, loopSamples, loopStartSample } = render();
  expect(isPeriodic(render())).toBe(true);
  const window = (start: number): Float32Array =>
    pcm.subarray(start, start + LOOP_LEAD_IN_SAMPLES + LOOP_TAIL_SAMPLES);
  const first = loopStartSample - LOOP_LEAD_IN_SAMPLES;
  expect(window(first + loopSamples)).toEqual(window(first));
});

test('notes that ring over the loop end repeat too, at a tempo whose steps fall between samples', () => {
  const song = testSong({
    bpm: 137,
    sections: {
      A: section({
        lead: channel({ 60: 'E5', 61: '-', 62: '-', 63: '-' }),
        bass: channel({ 0: 'A1', 62: 'E2', 63: '-' }),
        drums: channel({ 0: 'k', 61: 'o', 63: 's' }),
        meow: channel({ 0: 'C5', 62: 'D5', 63: '-' }),
      }),
    },
  });
  const songRender = renderSong(song, 'ringing');
  expect(songRender.loopSamples).toBe(Math.round(64 * (60 / 137 / 4) * 48_000));
  expect(isPeriodic(songRender)).toBe(true);
});

test('a render that does not repeat is detected', () => {
  const original = render();
  const pcm = original.pcm.slice();
  pcm[original.loopStartSample + 100] = (pcm[original.loopStartSample + 100] ?? 0) + 0.001;
  expect(isPeriodic({ ...original, pcm })).toBe(false);
});

test('the render is audible, never clips and stays below the clip limit', () => {
  const { pcm, clippedSamples } = render();
  expect(clippedSamples).toBe(0);
  expect(peakOf(pcm)).toBeLessThanOrEqual(Math.fround(CLIP_LIMIT));
  expect(peakOf(pcm)).toBeGreaterThan(0.1);
  expect(peakOf(pcm.subarray(LOOP_LEAD_IN_SAMPLES, LOOP_LEAD_IN_SAMPLES + 48_000))).toBeGreaterThan(
    0.05,
  );
});

test('two renders are byte-identical', () => {
  const again = renderSong(meowHouse(), 'meow-house');
  expect(Buffer.from(again.pcm.buffer).equals(Buffer.from(render().pcm.buffer))).toBe(true);
});

test('the noise seed is part of the render: another song id changes the drums', () => {
  const other = renderSong(meowHouse(), 'another-song');
  expect(Buffer.from(other.pcm.buffer).equals(Buffer.from(render().pcm.buffer))).toBe(false);
});
