// R15K Arcade tools – checks the SFX definitions before they are rendered: unique ids that are safe as
// file names, at least one tone per effect, known waves and finite, positive timing, pitch and volume
// values (volumes at most 1, attacks shorter than their tone, pitches below the Nyquist frequency).
import type { SfxDefinition, ToneSpec } from '@r15k/engine';
import { SAMPLE_RATE } from './levels.ts';

/** Lower-case words joined by single hyphens. */
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Waves the renderer can play. */
const WAVES: ReadonlySet<string> = new Set(['square', 'pulse25', 'pulse12', 'triangle', 'noise']);
/** Highest playable frequency (Hz). */
const NYQUIST_HZ = SAMPLE_RATE / 2;

/** Whether a value is a finite number above 0. */
function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/** Whether a value is a frequency the renderer can play. */
function isPlayable(value: number | undefined): boolean {
  return value === undefined || (isPositive(value) && value < NYQUIST_HZ);
}

/** Problems of one tone; `label` names it in the messages. */
function toneErrors(tone: ToneSpec, label: string): readonly string[] {
  const checks: readonly (readonly [boolean, string])[] = [
    [WAVES.has(tone.wave), `unknown wave ${tone.wave}`],
    [Number.isFinite(tone.startSeconds) && tone.startSeconds >= 0, 'start must be at least 0 s'],
    [isPositive(tone.durationSeconds), 'duration must be above 0 s'],
    [isPlayable(tone.frequencyHz), 'frequency must lie between 0 Hz and the Nyquist frequency'],
    [
      isPlayable(tone.endFrequencyHz),
      'end frequency must lie between 0 Hz and the Nyquist frequency',
    ],
    [isPositive(tone.volume) && tone.volume <= 1, 'volume must lie in (0, 1]'],
    [
      tone.attackSeconds === undefined ||
        (isPositive(tone.attackSeconds) && tone.attackSeconds < tone.durationSeconds),
      'attack must be above 0 s and shorter than the tone',
    ],
  ];
  return checks.filter(([isValid]) => !isValid).map(([, message]) => `${label}: ${message}`);
}

/** Every problem of the SFX definitions (empty when all of them can be rendered). */
export function validateSfxDefinitions(definitions: readonly SfxDefinition[]): readonly string[] {
  const seen = new Set<string>();
  return definitions.flatMap((definition) => {
    const { id, tones } = definition;
    const errors: string[] = [];
    if (!ID_PATTERN.test(id)) {
      errors.push(`sfx '${id}': the id must be lower-case words joined by hyphens`);
    }
    if (seen.has(id)) {
      errors.push(`sfx '${id}': the id is defined twice`);
    }
    if (tones.length === 0) {
      errors.push(`sfx '${id}': no tones`);
    }
    seen.add(id);
    return [
      ...errors,
      ...tones.flatMap((tone, index) => toneErrors(tone, `sfx '${id}' tone ${index}`)),
    ];
  });
}
