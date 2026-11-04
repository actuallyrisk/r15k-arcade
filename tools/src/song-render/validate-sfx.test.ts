import type { SfxDefinition, ToneSpec } from '@r15k/engine';
import { expect, test } from 'vitest';
import { ALL_SFX } from './sfx-sources.ts';
import { validateSfxDefinitions } from './validate-sfx.ts';

const TONE: ToneSpec = {
  wave: 'square',
  startSeconds: 0,
  durationSeconds: 0.1,
  frequencyHz: 440,
  volume: 0.05,
};

/** A one-tone effect with `overrides` applied to the tone. */
const effect = (overrides: Partial<ToneSpec>, id = 'probe'): SfxDefinition => ({
  id,
  tones: [{ ...TONE, ...overrides }],
});

test('every effect of the game and the app is valid', () => {
  expect(validateSfxDefinitions(ALL_SFX)).toEqual([]);
});

test.each<readonly [string, readonly SfxDefinition[], string]>([
  [
    'an id with capitals',
    [effect({}, 'Bug-Catch')],
    "sfx 'Bug-Catch': the id must be lower-case words joined by hyphens",
  ],
  [
    'an id with a path',
    [effect({}, '../x')],
    "sfx '../x': the id must be lower-case words joined by hyphens",
  ],
  ['a duplicate id', [effect({}), effect({})], "sfx 'probe': the id is defined twice"],
  ['no tones', [{ id: 'probe', tones: [] }], "sfx 'probe': no tones"],
  [
    'an unknown wave',
    [effect({ wave: 'sine' as ToneSpec['wave'] })],
    "sfx 'probe' tone 0: unknown wave sine",
  ],
  [
    'a negative start',
    [effect({ startSeconds: -0.1 })],
    "sfx 'probe' tone 0: start must be at least 0 s",
  ],
  [
    'a zero duration',
    [effect({ durationSeconds: 0 })],
    "sfx 'probe' tone 0: duration must be above 0 s",
  ],
  [
    'a frequency above Nyquist',
    [effect({ frequencyHz: 30_000 })],
    "sfx 'probe' tone 0: frequency must lie between 0 Hz and the Nyquist frequency",
  ],
  [
    'a sweep to 0 Hz',
    [effect({ endFrequencyHz: 0 })],
    "sfx 'probe' tone 0: end frequency must lie between 0 Hz and the Nyquist frequency",
  ],
  ['a volume above 1', [effect({ volume: 1.5 })], "sfx 'probe' tone 0: volume must lie in (0, 1]"],
  [
    'an attack longer than the tone',
    [effect({ attackSeconds: 0.2 })],
    "sfx 'probe' tone 0: attack must be above 0 s and shorter than the tone",
  ],
])('%s is an error', (_name, definitions, message) => {
  expect(validateSfxDefinitions(definitions)).toEqual([message]);
});
