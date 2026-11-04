// R15K Arcade tools – the voices of the music, ported from the original player's scheduler: the
// enveloped tone (pulse lead and harmony, triangle bass and snare body), the drum kit (sine kick and
// filtered noise) and the sung cat (sawtooth through a sweeping band-pass, with vibrato). Every voice is
// rendered on its own, starting at its onset sample, so it is identical wherever it is mixed in.
import { applyBiquad } from './biquad.ts';
import type { BiquadType } from './biquad.ts';
import { applyGain, mixInto } from './mix-buffer.ts';
import { noiseSamples } from './noise.ts';
import { renderOscillator } from './oscillator.ts';
import type { OscillatorShape } from './oscillator.ts';
import {
  automate,
  exponentialRampTo,
  linearRampTo,
  renderParam,
  setValueAt,
} from './param-automation.ts';
import type { ParamEvent } from './param-automation.ts';
import { sawtoothTable, triangleTable } from './wavetable.ts';

/** Gain the envelopes start from and fall back to (a silent but positive value). */
const SILENT_GAIN = 0.0001;
/** How long an oscillator or noise source runs after its envelope has ended (s). */
const SOURCE_TAIL_SECONDS = 0.02;
/** Web Audio defaults of the automated parameters before their first event. */
const DEFAULT_FREQUENCY_HZ = 440;
const DEFAULT_FILTER_HZ = 350;
const DEFAULT_GAIN = 1;

/** Samples of `seconds` at `sampleRate`. */
function samplesOf(seconds: number, sampleRate: number): number {
  return Math.round(seconds * sampleRate);
}

/** The values of a gain automation over `length` samples. */
function gainCurve(
  events: readonly ParamEvent[],
  length: number,
  sampleRate: number,
): Float64Array {
  return renderParam(automate(DEFAULT_GAIN, events), length, sampleRate);
}

/** An oscillator of `length` samples with automated frequency, multiplied by an automated gain. */
function enveloped(
  source: { readonly shape: OscillatorShape; readonly frequency: readonly ParamEvent[] },
  gain: readonly ParamEvent[],
  context: { readonly length: number; readonly sampleRate: number },
): Float64Array {
  const { length, sampleRate } = context;
  const frequencies = renderParam(
    automate(DEFAULT_FREQUENCY_HZ, source.frequency),
    length,
    sampleRate,
  );
  const signal = renderOscillator(source.shape, frequencies, sampleRate);
  return applyGain(signal, gainCurve(gain, length, sampleRate));
}

/** A tone as the original player's `tone()`: fast attack, decay to 65 %, hold, release to silence. */
export interface ToneVoice {
  readonly shape: OscillatorShape;
  readonly frequencyHz: number;
  readonly durationSeconds: number;
  readonly volume: number;
}

/** Renders a tone voice. */
export function renderTone(tone: ToneVoice, sampleRate: number): Float64Array {
  const { durationSeconds: duration, volume } = tone;
  const gain = [
    setValueAt(SILENT_GAIN, 0),
    linearRampTo(volume, 0.004),
    linearRampTo(volume * 0.65, Math.min(0.1, duration * 0.6)),
    setValueAt(volume * 0.65, Math.max(0.02, duration - 0.015)),
    linearRampTo(SILENT_GAIN, duration),
  ];
  const source = { shape: tone.shape, frequency: [setValueAt(tone.frequencyHz, 0)] };
  const length = samplesOf(duration + SOURCE_TAIL_SECONDS, sampleRate);
  return enveloped(source, gain, { length, sampleRate });
}

/** The kick: a sine falling from 150 to 42 Hz with a fast exponential decay. */
function renderKick(sampleRate: number): Float64Array {
  const source = {
    shape: 'sine' as const,
    frequency: [setValueAt(150, 0), exponentialRampTo(42, 0.12)],
  };
  const gain = [setValueAt(0.55, 0), exponentialRampTo(SILENT_GAIN, 0.16)];
  return enveloped(source, gain, { length: samplesOf(0.18, sampleRate), sampleRate });
}

/** A filtered noise burst as the original player's `hiss()`. */
interface HissSound {
  readonly durationSeconds: number;
  readonly type: BiquadType;
  readonly frequencyHz: number;
  readonly volume: number;
}

/** Renders a noise burst: noise → biquad (Q 1, the Web Audio default) → exponential decay. */
function renderHiss(hiss: HissSound, noiseKey: string, sampleRate: number): Float64Array {
  const length = samplesOf(hiss.durationSeconds + SOURCE_TAIL_SECONDS, sampleRate);
  const filtered = applyBiquad(
    noiseSamples(noiseKey, length),
    { type: hiss.type, q: 1, sampleRate },
    hiss.frequencyHz,
  );
  const gain = [setValueAt(hiss.volume, 0), exponentialRampTo(SILENT_GAIN, hiss.durationSeconds)];
  return applyGain(filtered, gainCurve(gain, length, sampleRate));
}

/** Closed hi-hat (also part of `x`). */
const HI_HAT: HissSound = {
  durationSeconds: 0.035,
  type: 'highpass',
  frequencyHz: 7000,
  volume: 0.07,
};

/** The noise bursts of each drum token. */
const DRUM_HISSES: ReadonlyMap<string, HissSound> = new Map<string, HissSound>([
  ['h', HI_HAT],
  ['x', HI_HAT],
  ['o', { durationSeconds: 0.18, type: 'highpass', frequencyHz: 6500, volume: 0.06 }],
  ['s', { durationSeconds: 0.14, type: 'bandpass', frequencyHz: 1800, volume: 0.26 }],
]);

/** Drum tokens that play the kick. */
const KICK_TOKENS: ReadonlySet<string> = new Set(['k', 'x']);

/** The triangle body of the snare. */
const SNARE_BODY = { frequencyHz: 185, durationSeconds: 0.06, volume: 0.12 } as const;

/** The sum of several voice buffers, as long as the longest. */
function sumVoices(voices: readonly Float64Array[]): Float64Array {
  const sum = new Float64Array(Math.max(0, ...voices.map((voice) => voice.length)));
  for (const voice of voices) {
    mixInto(sum, voice, 0);
  }
  return sum;
}

/** Renders a drum token (`k` kick, `h` hi-hat, `o` open hi-hat, `s` snare, `x` kick and hi-hat). */
export function renderDrum(token: string, noiseKey: string, sampleRate: number): Float64Array {
  const voices: Float64Array[] = [];
  if (KICK_TOKENS.has(token)) {
    voices.push(renderKick(sampleRate));
  }
  const hiss = DRUM_HISSES.get(token);
  if (hiss !== undefined) {
    voices.push(renderHiss(hiss, noiseKey, sampleRate));
  }
  if (token === 's') {
    voices.push(renderTone({ shape: triangleTable(), ...SNARE_BODY }, sampleRate));
  }
  return sumVoices(voices);
}

/** A sung note as the original player's `sing()`. */
export interface SungNote {
  readonly frequencyHz: number;
  readonly durationSeconds: number;
  readonly volume: number;
}

/** Shortest sung note (s). */
const MIN_SUNG_SECONDS = 0.16;
/** Vibrato rate (Hz) and depth (share of the note frequency) of the sung cat. */
const VIBRATO_HZ = 6;
const VIBRATO_DEPTH = 0.012;

/** Per-sample pitch of a sung note: slide up from 80 %, hold with vibrato, drop to 75 % at `end`. */
function sungPitch(
  frequencyHz: number,
  end: number,
  context: { readonly length: number; readonly sampleRate: number },
): Float64Array {
  const { length, sampleRate } = context;
  const glide = automate(DEFAULT_FREQUENCY_HZ, [
    setValueAt(frequencyHz * 0.8, 0),
    exponentialRampTo(frequencyHz, 0.06),
    setValueAt(frequencyHz, end - 0.08),
    exponentialRampTo(frequencyHz * 0.75, end),
  ]);
  const depth = frequencyHz * VIBRATO_DEPTH;
  return renderParam(glide, length, sampleRate).map(
    (value, sample) => value + depth * Math.sin((2 * Math.PI * VIBRATO_HZ * sample) / sampleRate),
  );
}

/** Per-sample centre of the "mouth" band-pass: opens to 2.2 kHz, closes to 750 Hz at `end`. */
function mouthCutoff(
  end: number,
  context: { readonly length: number; readonly sampleRate: number },
): Float64Array {
  const mouth = automate(DEFAULT_FILTER_HZ, [
    setValueAt(700, 0),
    exponentialRampTo(2200, 0.07),
    setValueAt(2000, end - 0.09),
    exponentialRampTo(750, end),
  ]);
  return renderParam(mouth, context.length, context.sampleRate);
}

/**
 * Renders the sung cat: a sawtooth that slides up into the note ("mi"), holds it with vibrato ("a") and
 * drops at the end ("ow"), through a band-pass (Q 2.5) that opens and closes like a mouth.
 */
export function renderSung(note: SungNote, sampleRate: number): Float64Array {
  const end = Math.max(note.durationSeconds, MIN_SUNG_SECONDS);
  const context = { length: samplesOf(end + SOURCE_TAIL_SECONDS, sampleRate), sampleRate };
  const voiced = applyBiquad(
    renderOscillator(sawtoothTable(), sungPitch(note.frequencyHz, end, context), sampleRate),
    { type: 'bandpass', q: 2.5, sampleRate },
    mouthCutoff(end, context),
  );
  const gain = [
    setValueAt(SILENT_GAIN, 0),
    exponentialRampTo(note.volume, 0.03),
    setValueAt(note.volume, end - 0.06),
    exponentialRampTo(SILENT_GAIN, end),
  ];
  return applyGain(voiced, gainCurve(gain, context.length, sampleRate));
}
