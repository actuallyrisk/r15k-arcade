import type { SfxDefinition, ToneSpec, ToneWave } from '@r15k/engine';

/** Start, duration, frequency and peak volume of one tone. */
type Tone = readonly [
  startSeconds: number,
  durationSeconds: number,
  frequencyHz: number,
  volume: number,
];

/** A tone with the default attack and an exponential decay to silence (square unless noted). */
const tone = (
  [startSeconds, durationSeconds, frequencyHz, volume]: Tone,
  wave: ToneWave = 'square',
): ToneSpec => ({ wave, startSeconds, durationSeconds, frequencyHz, volume });

/** A square tone that sweeps exponentially to `endFrequencyHz` over its duration. */
const sweep = (spec: Tone, endFrequencyHz: number): ToneSpec => ({ ...tone(spec), endFrequencyHz });

/** Identifier of a UI sound effect. */
export type UiSfxId = 'ui-move' | 'ui-confirm' | 'ui-back' | 'ui-pause' | 'coin' | 'intro-tick';

/** The sound effects of the menus and the intro. */
export const UI_SFX: readonly SfxDefinition[] = [
  { id: 'ui-move', tones: [tone([0, 0.03, 1319, 0.04])] },
  { id: 'ui-confirm', tones: [sweep([0, 0.06, 988, 0.05], 1976)] },
  { id: 'ui-back', tones: [sweep([0, 0.06, 659, 0.05], 330)] },
  { id: 'ui-pause', tones: [tone([0, 0.06, 784, 0.05]), tone([0.06, 0.06, 523, 0.05])] },
  {
    id: 'coin',
    tones: [tone([0, 0.07, 988, 0.06], 'pulse25'), tone([0.07, 0.2, 1319, 0.06], 'pulse25')],
  },
  { id: 'intro-tick', tones: [tone([0, 0.04, 392, 0.04])] },
];
