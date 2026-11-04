import { expect, test } from 'vitest';
import { parseSongFile } from './song-format.ts';
import { meowHouseJson, section } from './test-support/songs.ts';

test('the shipped Meow House file has the shape of a song file', () => {
  const parsed = parseSongFile(meowHouseJson());
  expect(parsed.ok).toBe(true);
  if (parsed.ok) {
    expect(parsed.value.name).toBe('Meow House (R15K Edit)');
    expect(parsed.value.bpm).toBe(124);
    expect(parsed.value.order).toEqual(['A', 'C', 'A', 'B']);
    expect(Object.keys(parsed.value.sections)).toEqual(['A', 'C', 'B']);
    expect(parsed.value.chords?.['B']).toEqual(['Dm7', 'Em7', 'Fmaj7', 'E7']);
    expect(parsed.value.concept).toContain('Chiptune house');
  }
});

/** A valid song file as plain JSON. */
const VALID = { name: 'Test', bpm: 120, key: 'C', sections: { A: section() }, order: ['A'] };

test('optional fields stay absent when the file has none', () => {
  const parsed = parseSongFile(VALID);
  expect(parsed).toEqual({ ok: true, value: VALID });
});

test.each([
  ['a song that is not an object', [], 'a song file must be a JSON object'],
  ['a missing name', { ...VALID, name: undefined }, 'name must be a string'],
  ['a key that is not a string', { ...VALID, key: 7 }, 'key must be a string'],
  ['a concept that is not a string', { ...VALID, concept: ['x'] }, 'concept must be a string'],
  ['a tempo that is not a number', { ...VALID, bpm: '120' }, 'bpm must be a number 90..190'],
  ['missing sections', { ...VALID, sections: [] }, 'sections missing'],
  [
    'a section that is not an object',
    { ...VALID, sections: { A: 'x' } },
    'section A must be an object',
  ],
  [
    'a channel that is not a string',
    { ...VALID, sections: { A: { ...section(), bass: 1 } } },
    'A.bass must be a string',
  ],
  ['an order that is not a list of names', { ...VALID, order: 'A' }, 'order missing'],
  [
    'chords that are not an object',
    { ...VALID, chords: ['C'] },
    'chords must map section names to lists of chord names',
  ],
  [
    'a chord list that is not a list',
    { ...VALID, chords: { A: 'C' } },
    'chords.A must be a list of chord names',
  ],
])('%s is rejected', (_name, value, message) => {
  const parsed = parseSongFile(value);
  expect(parsed.ok).toBe(false);
  if (!parsed.ok) {
    expect(parsed.error).toContain(message);
  }
});

test('every problem of a file is listed', () => {
  const parsed = parseSongFile({ bpm: 'fast', sections: { A: {} } });
  expect(parsed.ok ? [] : parsed.error).toEqual([
    'name must be a string',
    'bpm must be a number 90..190',
    'key must be a string',
    'A.lead must be a string',
    'A.harmony must be a string',
    'A.bass must be a string',
    'A.drums must be a string',
    'A.meow must be a string',
    'order missing',
  ]);
});
