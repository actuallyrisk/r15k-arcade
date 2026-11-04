import { expect, test } from 'vitest';
import { LOOP_LEAD_IN_SAMPLES, LOOP_TAIL_SAMPLES } from './levels.ts';
import { buildMusicMetadata } from './metadata.ts';
import type { Mp3FrameInfo } from './mp3-frames.ts';

const LOOP = 1000;
const LENGTH = LOOP + LOOP_LEAD_IN_SAMPLES + LOOP_TAIL_SAMPLES;
/** Enough frames for LENGTH samples plus the encoder delay. */
const FRAMES: Mp3FrameInfo = { audioFrames: 65, hasInfoTag: false, samplesPerFrame: 1152 };

/** A PCM of LENGTH samples whose first audible sample is `onset`. */
function pcmWithOnset(onset: number): Float32Array {
  const pcm = new Float32Array(LENGTH).fill(0.01);
  pcm[onset] = -0.05;
  return pcm;
}

test('loop points, onset and encoder padding come from the render and the frame count', () => {
  const metadata = buildMusicMetadata({
    id: 'song',
    pcm: pcmWithOnset(123),
    loopSamples: LOOP,
    frames: FRAMES,
    inputHash: 'cafe0123',
  });
  expect(metadata).toMatchObject({
    file: 'song.mp3',
    pcmLength: LENGTH,
    loopStartSample: LOOP_LEAD_IN_SAMPLES,
    loopEndSample: LOOP_LEAD_IN_SAMPLES + LOOP,
    onsetSample: 123,
    encoder: { delaySamples: 1105, paddingSamples: 65 * 1152 - LENGTH - 576, frames: 65 },
    inputHash: 'cafe0123',
  });
});

test('a PCM that does not hold one loop with lead-in and tail is rejected', () => {
  expect(() =>
    buildMusicMetadata({
      id: 'song',
      pcm: new Float32Array(LENGTH - 1).fill(0.5),
      loopSamples: LOOP,
      frames: FRAMES,
      inputHash: 'x',
    }),
  ).toThrow('song: 72999 samples do not hold one loop with lead-in and tail');
});

test('silence or too few frames are rejected', () => {
  const silent = {
    id: 'song',
    pcm: new Float32Array(LENGTH),
    loopSamples: LOOP,
    frames: FRAMES,
    inputHash: 'x',
  };
  expect(() => buildMusicMetadata(silent)).toThrow(
    'song: no audible sample or fewer MP3 frames than samples',
  );
  const short = { ...silent, pcm: pcmWithOnset(0), frames: { ...FRAMES, audioFrames: 10 } };
  expect(() => buildMusicMetadata(short)).toThrow('fewer MP3 frames than samples');
});
