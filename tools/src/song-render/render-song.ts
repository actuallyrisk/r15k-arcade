// R15K Arcade tools – renders a song to mono PCM that loops seamlessly. Note onsets fall on whole samples
// (`floor(step · loopSamples / steps)`), so every pass is sample-identical; passes 0 and 1 and the first
// second of pass 2 go through the master chain (gain, 20 kHz low-pass, compressor) in one run, and the
// file is cut from 0.5 s before the end of pass 0 to 1 s into pass 2. Around both loop points the samples
// repeat exactly one loop later, so the loop is gapless wherever a decoder places its offset.
import { compileSong } from './compile-song.ts';
import type { NoteEvent } from './compile-song.ts';
import {
  LOOP_LEAD_IN_SAMPLES,
  LOOP_TAIL_SAMPLES,
  MUSIC_MASTER_GAIN,
  SAMPLE_RATE,
} from './levels.ts';
import type { SongFile } from './song-format.ts';
import { applyBiquad } from './synth/biquad.ts';
import { applyCompressor, MASTER_COMPRESSOR } from './synth/compressor.ts';
import { guardClipping, mixInto, scaleSignal } from './synth/mix-buffer.ts';
import { renderDrum, renderSung, renderTone } from './synth/voices.ts';
import type { ToneVoice } from './synth/voices.ts';
import { pulseTable, triangleTable } from './synth/wavetable.ts';

/** A rendered song. */
export interface SongRender {
  /** `loopSamples + LOOP_LEAD_IN_SAMPLES + LOOP_TAIL_SAMPLES` samples. */
  readonly pcm: Float32Array;
  readonly loopSamples: number;
  readonly loopStartSample: number;
  /** Exclusive. */
  readonly loopEndSample: number;
  readonly clippedSamples: number;
}

/** Passes in the render: 0 and 1 in full, then the start of pass 2. */
const PASSES = 3;
/** Sixteenth-note steps per beat. */
const STEPS_PER_BEAT = 4;
/** Master low-pass of the original player: 20 kHz, Q 0.8 dB. */
const MASTER_LOW_PASS = { frequencyHz: 20_000, q: 0.8 } as const;

/** Volumes of the channels. */
const VOLUMES = { lead: 0.15, harmony: 0.075, bass: 0.3, meow: 0.26 } as const;
/** Share of the written note length that lead, harmony and bass sound. */
const GATES = { lead: 0.88, harmony: 0.88, bass: 0.95 } as const;

/** Samples in one pass through the song. */
export function loopSampleCount(song: SongFile, steps: number): number {
  return Math.round(steps * (60 / song.bpm / STEPS_PER_BEAT) * SAMPLE_RATE);
}

/** What an event needs besides itself to be rendered. */
interface EventContext {
  readonly songId: string;
  readonly stepSeconds: number;
}

/** The enveloped tone of a lead, harmony or bass note. */
function pitchedTone(
  event: NoteEvent,
  channel: keyof typeof GATES,
  stepSeconds: number,
): ToneVoice {
  return {
    shape: channel === 'bass' ? triangleTable() : pulseTable(channel === 'lead' ? 0.25 : 0.125),
    frequencyHz: event.frequencyHz,
    durationSeconds: event.lengthSteps * stepSeconds * GATES[channel],
    volume: VOLUMES[channel],
  };
}

/** Renders one event as a voice that starts at its first sample. */
function renderEvent(event: NoteEvent, context: EventContext): Float64Array {
  const { channel } = event;
  switch (channel) {
    case 'drums':
      return renderDrum(event.token, `${context.songId}:${event.step}:${event.token}`, SAMPLE_RATE);
    case 'meow':
      return renderSung(
        {
          frequencyHz: event.frequencyHz,
          durationSeconds: event.lengthSteps * context.stepSeconds,
          volume: VOLUMES.meow,
        },
        SAMPLE_RATE,
      );
    case 'lead':
    case 'harmony':
    case 'bass':
      return renderTone(pitchedTone(event, channel, context.stepSeconds), SAMPLE_RATE);
  }
}

/** The raw mix of passes 0 … PASSES − 1, cut at `length` samples. */
function mixPasses(
  voices: readonly { readonly onset: number; readonly samples: Float64Array }[],
  loopSamples: number,
  length: number,
): Float64Array {
  const mix = new Float64Array(length);
  for (let pass = 0; pass < PASSES; pass += 1) {
    for (const voice of voices) {
      mixInto(mix, voice.samples, pass * loopSamples + voice.onset);
    }
  }
  return mix;
}

/** Renders a validated song; `songId` seeds its noise. */
export function renderSong(song: SongFile, songId: string): SongRender {
  const { steps, events } = compileSong(song);
  const loopSamples = loopSampleCount(song, steps);
  const context = { songId, stepSeconds: 60 / song.bpm / STEPS_PER_BEAT };
  const voices = events.map((event) => ({
    onset: Math.floor((event.step * loopSamples) / steps),
    samples: renderEvent(event, context),
  }));
  const length = 2 * loopSamples + LOOP_TAIL_SAMPLES;
  const lowPassed = applyBiquad(
    scaleSignal(mixPasses(voices, loopSamples, length), MUSIC_MASTER_GAIN),
    { type: 'lowpass', q: MASTER_LOW_PASS.q, sampleRate: SAMPLE_RATE },
    MASTER_LOW_PASS.frequencyHz,
  );
  const mastered = applyCompressor(lowPassed, MASTER_COMPRESSOR, SAMPLE_RATE);
  const { pcm, clippedSamples } = guardClipping(
    mastered.subarray(loopSamples - LOOP_LEAD_IN_SAMPLES),
    songId,
  );
  const render = {
    pcm,
    loopSamples,
    loopStartSample: LOOP_LEAD_IN_SAMPLES,
    loopEndSample: LOOP_LEAD_IN_SAMPLES + loopSamples,
    clippedSamples,
  };
  if (!isPeriodic(render)) {
    throw new Error(`${songId}: the render does not repeat exactly around its loop points`);
  }
  return render;
}

/**
 * Whether every sample from LOOP_LEAD_IN_SAMPLES before the loop start to LOOP_TAIL_SAMPLES after it
 * equals the sample one loop later.
 */
export function isPeriodic(render: SongRender): boolean {
  const { pcm, loopSamples, loopStartSample } = render;
  const first = loopStartSample - LOOP_LEAD_IN_SAMPLES;
  for (let sample = first; sample < loopStartSample + LOOP_TAIL_SAMPLES; sample += 1) {
    if (pcm[sample] !== pcm[sample + loopSamples]) {
      return false;
    }
  }
  return true;
}
