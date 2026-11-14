import { expect, test } from 'vitest';
import { parseAudioManifest, parseMusicMetadata } from './audio-types.ts';
import { TEST_METADATA } from './test-support/mixer-fixture.ts';

const MANIFEST = {
  format: 'r15k-audio-manifest',
  version: 1,
  inputHash: '9b7faa10',
  music: [{ id: 'meow-house', file: 'music/meow-house.mp3', metadata: 'music/meow-house.json' }],
  sfx: [
    { id: 'ui-move', file: 'sfx/ui-move.wav' },
    { id: 'bug-hunt.catch', file: 'sfx/bug-hunt.catch.wav' },
  ],
};

/** The problems a parser reports for `value`, or an empty list when it is valid. */
function problemsOf(
  parse: typeof parseAudioManifest | typeof parseMusicMetadata,
  value: unknown,
): readonly string[] {
  const result = parse(value);
  return result.ok ? [] : result.error;
}

test('a valid manifest parses into a copy with only the known fields', () => {
  const result = parseAudioManifest({ ...MANIFEST, extra: true });
  expect(result).toEqual({ ok: true, value: MANIFEST });
});

test('an empty manifest is valid', () => {
  expect(problemsOf(parseAudioManifest, { ...MANIFEST, music: [], sfx: [] })).toEqual([]);
});

test('every manifest problem is reported at once', () => {
  const problems = problemsOf(parseAudioManifest, {
    format: 'other',
    version: 2,
    music: [{ id: '', file: '../escape.mp3', metadata: 'https://example.com/x.json' }, 'oops'],
    sfx: [
      { id: 'a', file: '/abs.wav' },
      { id: 'a', file: 'sfx/a.wav' },
    ],
  });
  expect(problems).toEqual([
    'format: expected "r15k-audio-manifest"',
    'version: expected 1',
    'inputHash: expected a non-empty string',
    'music[0].id: expected a non-empty string',
    'music[0].file: expected a relative asset path',
    'music[0].metadata: expected a relative asset path',
    'music[1]: expected an object',
    'sfx[0].file: expected a relative asset path',
    "sfx: duplicate id 'a'",
  ]);
});

test.each([[undefined], [null], [[]], ['manifest'], [3]])('%j is not a manifest', (value) => {
  expect(problemsOf(parseAudioManifest, value)).toEqual(['document: expected an object']);
});

test('lists that are not arrays are reported', () => {
  expect(problemsOf(parseAudioManifest, { ...MANIFEST, music: {}, sfx: undefined })).toEqual([
    'music: expected an array',
    'sfx: expected an array',
  ]);
});

test('valid music metadata parses into an equal copy', () => {
  expect(parseMusicMetadata({ ...TEST_METADATA })).toEqual({ ok: true, value: TEST_METADATA });
  expect(
    problemsOf(parseMusicMetadata, {
      ...TEST_METADATA,
      encoder: { ...TEST_METADATA.encoder, paddingSamples: -3 },
    }),
  ).toEqual([]);
});

test('every field problem of music metadata is reported', () => {
  const problems = problemsOf(parseMusicMetadata, {
    ...TEST_METADATA,
    format: 'r15k-audio-manifest',
    channels: 2,
    sampleRate: 0,
    pcmLength: 1.5,
    loopStartSample: -1,
    encoder: { name: 'lame', delaySamples: '1105', frames: 0 },
  });
  expect(problems).toEqual([
    'format: expected "r15k-music"',
    'sampleRate: expected an integer ≥ 1',
    'channels: expected 1',
    'pcmLength: expected an integer ≥ 1',
    'loopStartSample: expected an integer ≥ 0',
    'encoder.delaySamples: expected an integer ≥ 0',
    'encoder.paddingSamples: expected an integer',
    'encoder.frames: expected an integer ≥ 1',
  ]);
});

test('a missing encoder record is one problem', () => {
  const { encoder: _encoder, ...withoutEncoder } = TEST_METADATA;
  expect(problemsOf(parseMusicMetadata, withoutEncoder)).toEqual(['encoder: expected an object']);
  expect(problemsOf(parseMusicMetadata, 'metadata')).toEqual(['document: expected an object']);
});

test('the loop and the onset must lie inside the PCM', () => {
  expect(
    problemsOf(parseMusicMetadata, {
      ...TEST_METADATA,
      loopStartSample: 40_000,
      loopEndSample: 50_000,
      onsetSample: 48_000,
    }),
  ).toEqual([
    'loopEndSample: expected at most pcmLength',
    'onsetSample: expected less than pcmLength',
  ]);
  expect(
    problemsOf(parseMusicMetadata, {
      ...TEST_METADATA,
      loopStartSample: 30_000,
      loopEndSample: 30_000,
    }),
  ).toEqual(['loopEndSample: expected more than loopStartSample']);
});
