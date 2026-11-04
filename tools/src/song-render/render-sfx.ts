// R15K Arcade tools – renders a sound effect definition to mono PCM like the original 404 game's
// `tone()`: per tone an oscillator (band-limited square, pulse, triangle or seeded noise) with an
// exponential attack and decay and an optional exponential frequency sweep, running on for
// SFX_TAIL_SECONDS after its envelope; the sum is lifted by SFX_RENDER_GAIN and clip-guarded.
import type { SfxDefinition, ToneSpec } from '@r15k/engine';
import { SAMPLE_RATE, SFX_RENDER_GAIN, SFX_TAIL_SECONDS } from './levels.ts';
import { applyGain, guardClipping, mixInto, scaleSignal } from './synth/mix-buffer.ts';
import { noiseSamples } from './synth/noise.ts';
import { renderOscillator } from './synth/oscillator.ts';
import { automate, exponentialRampTo, renderParam, setValueAt } from './synth/param-automation.ts';
import type { ParamEvent } from './synth/param-automation.ts';
import { pulseTable, squareTable, triangleTable } from './synth/wavetable.ts';

/** Gain an SFX envelope starts from and decays to. */
const SILENT_GAIN = 0.0001;
/** Attack of a tone without its own (s). */
const DEFAULT_ATTACK_SECONDS = 0.01;
/** Web Audio defaults of oscillator frequency and gain before their first event. */
const DEFAULT_FREQUENCY_HZ = 440;
const DEFAULT_GAIN = 1;

/** Samples of `seconds`. */
function samplesOf(seconds: number): number {
  return Math.round(seconds * SAMPLE_RATE);
}

/** The frequency automation of a tone: constant, or an exponential sweep over its duration. */
function frequencyEvents(tone: ToneSpec): readonly ParamEvent[] {
  const start = setValueAt(tone.frequencyHz, 0);
  return tone.endFrequencyHz === undefined
    ? [start]
    : [start, exponentialRampTo(tone.endFrequencyHz, tone.durationSeconds)];
}

/** The raw source of a tone (before its envelope) over `length` samples. */
function toneSource(tone: ToneSpec, length: number, noiseKey: string): Float64Array {
  if (tone.wave === 'noise') {
    return noiseSamples(noiseKey, length);
  }
  const frequencies = renderParam(
    automate(DEFAULT_FREQUENCY_HZ, frequencyEvents(tone)),
    length,
    SAMPLE_RATE,
  );
  const highest = Math.max(tone.frequencyHz, tone.endFrequencyHz ?? 0);
  const tables = {
    square: () => squareTable(highest),
    pulse25: () => pulseTable(0.25),
    pulse12: () => pulseTable(0.125),
    triangle: () => triangleTable(),
  };
  return renderOscillator(tables[tone.wave](), frequencies, SAMPLE_RATE);
}

/** One tone, starting at its first sample. */
function renderSfxTone(tone: ToneSpec, noiseKey: string): Float64Array {
  const length = samplesOf(tone.durationSeconds + SFX_TAIL_SECONDS);
  const gain = automate(DEFAULT_GAIN, [
    setValueAt(SILENT_GAIN, 0),
    exponentialRampTo(tone.volume, tone.attackSeconds ?? DEFAULT_ATTACK_SECONDS),
    exponentialRampTo(SILENT_GAIN, tone.durationSeconds),
  ]);
  return applyGain(toneSource(tone, length, noiseKey), renderParam(gain, length, SAMPLE_RATE));
}

/** Samples of the rendered effect: the end of its last tone plus SFX_TAIL_SECONDS. */
export function sfxLength(definition: SfxDefinition): number {
  const end = Math.max(
    0,
    ...definition.tones.map((tone) => tone.startSeconds + tone.durationSeconds),
  );
  return samplesOf(end + SFX_TAIL_SECONDS);
}

/** Renders a sound effect to float32 PCM at SAMPLE_RATE. */
export function renderSfx(definition: SfxDefinition): Float32Array {
  const mix = new Float64Array(sfxLength(definition));
  definition.tones.forEach((tone, index) => {
    const voice = renderSfxTone(tone, `sfx:${definition.id}:${index}`);
    mixInto(mix, voice, samplesOf(tone.startSeconds));
  });
  return guardClipping(scaleSignal(mix, SFX_RENDER_GAIN), definition.id).pcm;
}
