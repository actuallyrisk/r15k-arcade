import { parseMusicMetadata } from '@r15k/engine';
import { expect, test } from 'vitest';
import { LOOP_LEAD_IN_SAMPLES, LOOP_TAIL_SAMPLES } from './levels.ts';
import { buildMusicMetadata } from './metadata.ts';
import {
  encodeMp3,
  installedEncoderVersion,
  MP3_ENCODER_NAME,
  MP3_ENCODER_VERSION,
} from './mp3.ts';
import { scanMp3Frames } from './mp3-frames.ts';

const OPTIONS = { sampleRate: 48_000, bitrateKbps: 96 } as const;

/** `length` samples of a 440 Hz sine at amplitude 0.3, silent for the first `silent` samples. */
function sine(length: number, silent = 0): Float32Array {
  return Float32Array.from({ length }, (_, index) =>
    index < silent ? 0 : 0.3 * Math.sin((2 * Math.PI * 440 * index) / 48_000),
  );
}

test('the installed encoder is the version the metadata names', () => {
  expect(installedEncoderVersion()).toBe(MP3_ENCODER_VERSION);
  expect(MP3_ENCODER_NAME).toBe('lame (wasm-media-encoders 0.7.0)');
});

test('the encoded stream holds enough 1152-sample frames for the PCM and the encoder delay, and no more', async () => {
  const pcm = sine(100_000);
  const { audioFrames, hasInfoTag } = scanMp3Frames(await encodeMp3(pcm, OPTIONS));
  expect(hasInfoTag).toBe(false);
  expect(audioFrames * 1152).toBeGreaterThanOrEqual(pcm.length + 576);
  expect(audioFrames * 1152).toBeLessThan(pcm.length + 576 + 2 * 1152);
});

test('encoding is deterministic and constant-bitrate (96 kbps: 288 or 289 bytes per frame)', async () => {
  const pcm = sine(48_000);
  const first = await encodeMp3(pcm, OPTIONS);
  expect(await encodeMp3(pcm, OPTIONS)).toEqual(first);
  const { audioFrames } = scanMp3Frames(first);
  expect(first.length).toBeGreaterThanOrEqual(audioFrames * 288);
  expect(first.length).toBeLessThanOrEqual(audioFrames * 289);
});

test('the music metadata of an encoded loop passes the parser of the mixer', async () => {
  const loopSamples = 96_000;
  const pcm = sine(loopSamples + LOOP_LEAD_IN_SAMPLES + LOOP_TAIL_SAMPLES, 300);
  const frames = scanMp3Frames(await encodeMp3(pcm, OPTIONS));
  const metadata = buildMusicMetadata({
    id: 'probe',
    pcm,
    loopSamples,
    frames,
    inputHash: '0123abcd',
  });
  expect(parseMusicMetadata(JSON.parse(JSON.stringify(metadata)))).toEqual({
    ok: true,
    value: metadata,
  });
  expect(metadata).toEqual({
    format: 'r15k-music',
    version: 1,
    id: 'probe',
    file: 'probe.mp3',
    sampleRate: 48_000,
    channels: 1,
    bitrateKbps: 96,
    pcmLength: pcm.length,
    loopStartSample: 24_000,
    loopEndSample: 24_000 + loopSamples,
    onsetSample: 300,
    encoder: {
      name: 'lame (wasm-media-encoders 0.7.0)',
      delaySamples: 1105,
      paddingSamples: frames.audioFrames * 1152 - pcm.length - 576,
      frames: frames.audioFrames,
    },
    inputHash: '0123abcd',
  });
});
