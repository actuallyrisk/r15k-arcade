import type { SfxDefinition, ToneSpec } from '@r15k/engine';

/** Start, duration, frequency and peak volume of one square tone. */
type SquareTone = readonly [
  startSeconds: number,
  durationSeconds: number,
  frequencyHz: number,
  volume: number,
];

/** A square tone with the default attack and an exponential decay to silence. */
const square = ([startSeconds, durationSeconds, frequencyHz, volume]: SquareTone): ToneSpec => ({
  wave: 'square',
  startSeconds,
  durationSeconds,
  frequencyHz,
  volume,
});

/** A square tone that sweeps exponentially to `endFrequencyHz` over its duration. */
const sweep = (tone: SquareTone, endFrequencyHz: number): ToneSpec => ({
  ...square(tone),
  endFrequencyHz,
});

/** Identifier of a Bug Hunt sound effect. */
export type BugHuntSfxId =
  | 'bug-catch'
  | 'gold-catch'
  | 'bomb'
  | 'tick'
  | 'go'
  | 'round-over'
  | 'new-record'
  | 'combo-2'
  | 'combo-3'
  | 'combo-4';

/** The sound effects of a round, ported from the original 404 game. */
export const BUG_HUNT_SFX: readonly SfxDefinition[] = [
  { id: 'bug-catch', tones: [sweep([0, 0.07, 880, 0.07], 1320)] },
  {
    id: 'gold-catch',
    tones: [
      square([0, 0.09, 988, 0.06]),
      square([0.06, 0.09, 1319, 0.06]),
      square([0.12, 0.09, 1976, 0.06]),
    ],
  },
  { id: 'bomb', tones: [sweep([0, 0.35, 196, 0.09], 49)] },
  { id: 'tick', tones: [square([0, 0.05, 523, 0.05])] },
  { id: 'go', tones: [square([0, 0.18, 1047, 0.06])] },
  {
    id: 'round-over',
    tones: [
      square([0, 0.13, 784, 0.06]),
      square([0.11, 0.13, 659, 0.06]),
      square([0.22, 0.13, 523, 0.06]),
      square([0.33, 0.13, 392, 0.06]),
    ],
  },
  {
    id: 'new-record',
    tones: [
      square([0, 0.13, 523, 0.06]),
      square([0.11, 0.13, 659, 0.06]),
      square([0.22, 0.13, 784, 0.06]),
      square([0.33, 0.13, 1047, 0.06]),
      square([0.44, 0.13, 1319, 0.06]),
    ],
  },
  { id: 'combo-2', tones: [square([0, 0.08, 659, 0.06]), square([0.05, 0.08, 988, 0.06])] },
  {
    id: 'combo-3',
    tones: [
      square([0, 0.08, 659, 0.06]),
      square([0.05, 0.08, 988, 0.06]),
      square([0.1, 0.08, 1319, 0.06]),
    ],
  },
  {
    id: 'combo-4',
    tones: [
      square([0, 0.08, 659, 0.06]),
      square([0.05, 0.08, 988, 0.06]),
      square([0.1, 0.08, 1319, 0.06]),
      square([0.15, 0.08, 1760, 0.06]),
    ],
  },
];
