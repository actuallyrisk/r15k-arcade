import type { SfxDefinition, ToneWave } from '@r15k/engine';
import { expect, test } from 'vitest';
import { CLIP_LIMIT, SAMPLE_RATE, SFX_RENDER_GAIN } from './levels.ts';
import { renderSfx, sfxLength } from './render-sfx.ts';
import { ALL_SFX } from './sfx-sources.ts';
import { peakOf } from './synth/mix-buffer.ts';

test('the game and the app define 16 effects', () => {
  expect(ALL_SFX).toHaveLength(16);
});

test.each(ALL_SFX.map((definition) => [definition.id, definition] as const))(
  '%s lasts until its last tone ends plus 30 ms, is audible and stays below the clip limit',
  (_id, definition) => {
    const pcm = renderSfx(definition);
    const end = Math.max(
      ...definition.tones.map((tone) => tone.startSeconds + tone.durationSeconds),
    );
    expect(pcm).toHaveLength(Math.round((end + 0.03) * SAMPLE_RATE));
    expect(pcm).toHaveLength(sfxLength(definition));
    expect(peakOf(pcm)).toBeGreaterThan(0.1);
    expect(peakOf(pcm)).toBeLessThanOrEqual(Math.fround(CLIP_LIMIT));
  },
);

test('a tone starts at its start sample and its envelope peaks near volume × render gain', () => {
  const pcm = renderSfx({
    id: 'probe',
    tones: [
      { wave: 'square', startSeconds: 0.05, durationSeconds: 0.1, frequencyHz: 500, volume: 0.05 },
    ],
  });
  expect(peakOf(pcm.subarray(0, Math.round(0.05 * SAMPLE_RATE)))).toBe(0);
  expect(peakOf(pcm)).toBeGreaterThan(0.05 * SFX_RENDER_GAIN * 0.8);
  expect(peakOf(pcm)).toBeLessThanOrEqual(0.05 * SFX_RENDER_GAIN);
});

test.each<ToneWave>(['pulse25', 'pulse12', 'triangle', 'noise'])('a %s tone renders', (wave) => {
  const definition: SfxDefinition = {
    id: `probe-${wave}`,
    tones: [
      {
        wave,
        startSeconds: 0,
        durationSeconds: 0.08,
        frequencyHz: 660,
        volume: 0.06,
        attackSeconds: 0.005,
      },
    ],
  };
  const pcm = renderSfx(definition);
  expect(pcm).toHaveLength(Math.round(0.11 * SAMPLE_RATE));
  expect(peakOf(pcm)).toBeGreaterThan(0.06);
  expect(renderSfx(definition)).toEqual(pcm);
});

test('a sweep ends near its end frequency', () => {
  const sweep = renderSfx({
    id: 'sweep',
    tones: [
      {
        wave: 'square',
        startSeconds: 0,
        durationSeconds: 0.35,
        frequencyHz: 196,
        endFrequencyHz: 49,
        volume: 0.09,
      },
    ],
  });
  const steady = renderSfx({
    id: 'steady',
    tones: [
      { wave: 'square', startSeconds: 0, durationSeconds: 0.35, frequencyHz: 196, volume: 0.09 },
    ],
  });
  const crossings = (pcm: Float32Array): number =>
    pcm.subarray(1).filter((value, index) => Math.sign(value) !== Math.sign(pcm[index] ?? 0))
      .length;
  expect(crossings(sweep)).toBeLessThan(crossings(steady) * 0.75);
});
