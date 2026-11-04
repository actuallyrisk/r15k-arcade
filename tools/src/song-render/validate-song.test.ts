import { expect, test } from 'vitest';
import type { SongFile } from './song-format.ts';
import { channel, meowHouse, section, testSong } from './test-support/songs.ts';
import { validateSong } from './validate-song.ts';

test('Meow House has no errors and exactly the one authoring note of the original validator', () => {
  const report = validateSong(meowHouse());
  expect(report.errors).toEqual([]);
  expect(report.warnings).toEqual(['B: only 0 meow(s) - the hook should actually meow']);
  expect(report.loopSeconds).toBeCloseTo(30.9677, 4);
});

test('the minimal test song is valid and has no notes', () => {
  expect(validateSong(testSong())).toEqual({ errors: [], warnings: [], loopSeconds: 8 });
});

/** A song whose only section has the given channels. */
const withSection = (overrides: Parameters<typeof section>[0]): SongFile =>
  testSong({ sections: { A: section(overrides) } });

test.each<readonly [string, SongFile, string]>([
  ['a tempo below 90', testSong({ bpm: 89 }), 'bpm must be a number 90..190'],
  ['a tempo above 190', testSong({ bpm: 191 }), 'bpm must be a number 90..190'],
  ['a tempo that is not finite', testSong({ bpm: Number.NaN }), 'bpm must be a number 90..190'],
  ['an empty order', testSong({ order: [] }), 'order missing'],
  ['an unknown section', testSong({ order: ['A', 'Z'] }), 'order references unknown section Z'],
  ['too few tokens', withSection({ lead: channel({}, 63) }), 'A.lead: 63 tokens, need 64'],
  ['too many tokens', withSection({ drums: channel({}, 65) }), 'A.drums: 65 tokens, need 64'],
  ['a bad drum token', withSection({ drums: channel({ 3: 'q' }) }), 'A.drums[3]: bad token q'],
  [
    'a sustain in the drums',
    withSection({ drums: channel({ 0: 'k', 1: '-' }) }),
    'A.drums[1]: bad token -',
  ],
  ['a bad note', withSection({ lead: channel({ 5: 'H4' }) }), 'A.lead[5]: bad note H4'],
  [
    'a note with two digits',
    withSection({ bass: channel({ 0: 'C10' }) }),
    'A.bass[0]: bad note C10',
  ],
  ['a lead below C4', withSection({ lead: channel({ 0: 'B3' }) }), 'A.lead[0]: B3 outside C4..E6'],
  ['a lead above E6', withSection({ lead: channel({ 0: 'F6' }) }), 'A.lead[0]: F6 outside C4..E6'],
  [
    'a harmony below G3',
    withSection({ harmony: channel({ 0: 'Gb3' }) }),
    'A.harmony[0]: Gb3 outside G3..C6',
  ],
  ['a bass above E3', withSection({ bass: channel({ 0: 'F3' }) }), 'A.bass[0]: F3 outside E1..E3'],
  [
    'a meow below D4',
    withSection({ meow: channel({ 0: 'C#4', 9: 'D4' }) }),
    'A.meow[0]: C#4 outside D4..A5',
  ],
  [
    'a sustain after a rest',
    withSection({ lead: channel({ 1: '-' }) }),
    'A.lead[1]: sustain after rest',
  ],
])('%s is an error', (_name, song, message) => {
  expect(validateSong(song).errors).toEqual([message]);
});

test('notes at both ends of a range are valid', () => {
  const song = withSection({
    lead: channel({ 0: 'C4', 8: 'E6' }),
    bass: channel({ 0: 'E1', 4: 'E3' }),
  });
  expect(validateSong(song).errors).toEqual([]);
});

test('a section that starts with a sustain gets a note, except in the meow channel', () => {
  const song = withSection({
    lead: channel({ 0: '-' }),
    meow: channel({ 0: '-', 4: 'C5', 8: 'D5' }),
  });
  expect(validateSong(song)).toMatchObject({
    errors: [],
    warnings: ['A.lead[0] starts with sustain (continues from previous section)'],
  });
});

test('fewer than two meows and more than twelve meows get a note', () => {
  const quiet = withSection({ meow: channel({ 0: 'C5' }) });
  const meows = Object.fromEntries(Array.from({ length: 13 }, (_, index) => [index * 4, 'C5']));
  const busy = withSection({ meow: channel(meows) });
  expect(validateSong(quiet).warnings).toEqual([
    'A: only 1 meow(s) - the hook should actually meow',
  ]);
  expect(validateSong(busy).warnings).toEqual([
    'A: 13 meows in 4 bars - probably too busy/annoying',
  ]);
});

test('the loop length counts every entry of the order', () => {
  expect(validateSong(testSong({ order: ['A', 'A', 'A'], bpm: 90 })).loopSeconds).toBeCloseTo(
    32,
    10,
  );
});
