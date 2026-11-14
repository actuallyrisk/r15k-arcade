// R15K Arcade tools – the loop metadata written next to each music file: loop points in the encoded PCM,
// the first audible sample (the mixer finds a decoder's offset from it) and the encoder's nominal delay
// and padding. The mixer does not trust the nominal delay; it measures the offset at runtime.
import type { MusicMetadata } from '@r15k/engine';
import { LOOP_LEAD_IN_SAMPLES, LOOP_TAIL_SAMPLES, SAMPLE_RATE } from './levels.ts';
import { MP3_ENCODER_NAME } from './mp3.ts';
import type { Mp3FrameInfo } from './mp3-frames.ts';

/** Bitrate of the music files (kbps). */
export const MUSIC_BITRATE_KBPS = 96;
/** Delay LAME adds before the first sample (samples). */
const ENCODER_DELAY_SAMPLES = 576;
/** Nominal delay a decoder sees: the encoder delay plus the decoder's own 529 samples. */
const NOMINAL_DELAY_SAMPLES = ENCODER_DELAY_SAMPLES + 529;
/** Level from which a sample counts as audible. */
const ONSET_LEVEL = 0.05;

/** The loop metadata of a rendered and encoded song. */
export function buildMusicMetadata(input: {
  readonly id: string;
  readonly pcm: Float32Array;
  readonly loopSamples: number;
  readonly frames: Mp3FrameInfo;
  readonly inputHash: string;
}): MusicMetadata {
  const { id, pcm, loopSamples, frames } = input;
  if (pcm.length !== loopSamples + LOOP_LEAD_IN_SAMPLES + LOOP_TAIL_SAMPLES) {
    throw new Error(`${id}: ${pcm.length} samples do not hold one loop with lead-in and tail`);
  }
  const onsetSample = pcm.findIndex((value) => Math.abs(value) >= ONSET_LEVEL);
  const paddingSamples =
    frames.audioFrames * frames.samplesPerFrame - pcm.length - ENCODER_DELAY_SAMPLES;
  if (onsetSample < 0 || paddingSamples < 0) {
    throw new Error(`${id}: no audible sample or fewer MP3 frames than samples`);
  }
  return {
    format: 'r15k-music',
    version: 1,
    id,
    file: `${id}.mp3`,
    sampleRate: SAMPLE_RATE,
    channels: 1,
    bitrateKbps: MUSIC_BITRATE_KBPS,
    pcmLength: pcm.length,
    loopStartSample: LOOP_LEAD_IN_SAMPLES,
    loopEndSample: LOOP_LEAD_IN_SAMPLES + loopSamples,
    onsetSample,
    encoder: {
      name: MP3_ENCODER_NAME,
      delaySamples: NOMINAL_DELAY_SAMPLES,
      paddingSamples,
      frames: frames.audioFrames,
    },
    inputHash: input.inputHash,
  };
}
