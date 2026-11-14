import { expect, test } from 'vitest';
import { songReport } from './song-report.ts';
import type { SongSection } from './song-format.ts';
import { channel, meowHouse, section, testSong } from './test-support/songs.ts';

/** Two meows off the beat and away from the notes under test. */
const QUIET_MEOWS = channel({ 33: 'C5', 41: 'D5' });

/** The report of a one-section song. */
const reportOf = (overrides: Partial<SongSection>, chords?: readonly string[]) =>
  songReport(
    testSong({
      sections: { A: section({ meow: QUIET_MEOWS, ...overrides }) },
      ...(chords === undefined ? {} : { chords: { A: chords } }),
    }),
  )[0];

test('Meow House reports the counts of the original validator and no clashes', () => {
  expect(songReport(meowHouse())).toEqual(
    [
      ['A', 5, 14, 38],
      ['C', 6, 18, 42],
      ['B', 0, 13, 31],
    ].map(([name, meows, leadNotes, drumHits]) => ({
      section: name,
      meows,
      leadNotes,
      drumHits,
      strongBeatClashes: 0,
      allClashes: 0,
      chordToneRatioStrongBeats: 1,
      firstClashes: [],
    })),
  );
});

test('a minor second between sounding voices on a strong beat is a listed clash', () => {
  const report = reportOf({ lead: channel({ 0: 'C5', 1: '-' }), harmony: channel({ 0: 'C#5' }) });
  expect(report).toMatchObject({
    strongBeatClashes: 1,
    allClashes: 1,
    firstClashes: ['step 0 lead/harmony interval 1'],
  });
});

test('a sustained note keeps sounding, and a tritone off the beat counts only in the total', () => {
  const report = reportOf({
    lead: channel({ 0: 'C5', 1: '-', 2: '-' }),
    bass: channel({ 2: 'F#2' }),
  });
  expect(report).toMatchObject({ strongBeatClashes: 0, allClashes: 1, firstClashes: [] });
});

test('the chord-tone ratio counts lead and meow notes on strong beats', () => {
  const notes = { lead: channel({ 0: 'E5', 4: 'F5' }), meow: channel({ 8: 'G4', 12: 'C5' }) };
  expect(reportOf(notes, ['C', 'C', 'C', 'C'])?.chordToneRatioStrongBeats).toBe(0.75);
  expect(reportOf(notes)?.chordToneRatioStrongBeats).toBeUndefined();
  expect(reportOf(notes, ['Cm9'])?.chordToneRatioStrongBeats).toBeUndefined();
});

test('each bar uses its own chord, with accidentals and qualities', () => {
  // F#m7 = F# A C# E, Bbmaj7 = Bb D F A, Dsus2 = D E A, Ebdim = Eb Gb A.
  const lead = channel({ 0: 'A4', 16: 'D5', 32: 'G4', 48: 'A4' });
  const report = reportOf({ lead }, ['F#m7', 'Bbmaj7', 'Dsus2', 'Ebdim']);
  expect(report?.chordToneRatioStrongBeats).toBe(0.75);
});
