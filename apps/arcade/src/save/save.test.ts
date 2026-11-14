import { expect, test } from 'vitest';
import { createDefaultSave, DEFAULT_SETTINGS } from './save-defaults.ts';
import { ARCADE_SAVE_SCHEMA } from './save-schema.ts';
import type { ScoreEntryV1 } from './save-schema.ts';
import { validateSave } from './save-validate.ts';
import { bestScore, insertTop10, qualifiesForTop10, TOP10_SIZE } from './top10.ts';

/** An entry with a score. */
const entry = (initials: string, score: number): ScoreEntryV1 => ({
  initials,
  score,
  date: '2026-11-04',
});

/** A full list of ten entries, scores 100 down to 10. */
const FULL = Array.from({ length: TOP10_SIZE }, (_unused, index) =>
  entry('AAA', (TOP10_SIZE - index) * 10),
);

test('the defaults are the documented fresh install', () => {
  expect(DEFAULT_SETTINGS).toMatchObject({
    musicVolume: 70,
    sfxVolume: 80,
    isMuted: false,
    theme: 'system',
    language: 'system',
    reducedMotion: 'system',
    intro: 'short',
  });
  expect(createDefaultSave()).toMatchObject({
    schemaVersion: 1,
    scores: { bugHunt: { arcade: [] } },
    meta: { hasCompletedFirstLaunch: false, launchCount: 0, lastInitials: 'AAA' },
  });
  expect(ARCADE_SAVE_SCHEMA.createDefault()).toEqual(createDefaultSave());
  expect(ARCADE_SAVE_SCHEMA.currentVersion).toBe(1);
});

test('a valid document passes and is rebuilt without unknown fields', () => {
  const document = { ...createDefaultSave(), extra: true };
  const result = ARCADE_SAVE_SCHEMA.validate(JSON.parse(JSON.stringify(document)));
  expect(result).toEqual({ ok: true, value: createDefaultSave() });
});

/** The issues of a document with one field replaced. */
function issuesOf(change: (document: Record<string, unknown>) => void): readonly string[] {
  const document = JSON.parse(JSON.stringify(createDefaultSave())) as Record<string, unknown>;
  change(document);
  const result = validateSave(document);
  return result.ok ? [] : result.error;
}

/** A nested object of a parsed document. */
const at = (value: unknown, key: string): Record<string, unknown> =>
  (value as Record<string, Record<string, unknown>>)[key] ?? {};

test.each([
  ['musicVolume', 75],
  ['sfxVolume', 110],
  ['isMuted', 'no'],
  ['theme', 'blue'],
  ['language', 'fr'],
  ['reducedMotion', true],
  ['intro', 'long'],
  ['bindings', 3],
])('settings.%s is checked', (key, value) => {
  const issues = issuesOf((document) => {
    at(document, 'settings')[key] = value;
  });
  expect(issues.join('\n')).toContain(`save.settings.${key}`);
});

test.each([
  ['hasCompletedFirstLaunch', 1],
  ['launchCount', -1],
  ['lastInitials', 'ab'],
])('meta.%s is checked', (key, value) => {
  const issues = issuesOf((document) => {
    at(document, 'meta')[key] = value;
  });
  expect(issues.join('\n')).toContain(`save.meta.${key}`);
});

test('the version, sections and top-10 entries are checked', () => {
  expect(validateSave(null)).toEqual({ ok: false, error: ['save: expected an object'] });
  expect(issuesOf((document) => (document['schemaVersion'] = 2))).toEqual([
    'save.schemaVersion: expected 1',
  ]);
  expect(issuesOf((document) => (document['meta'] = []))).toEqual([
    'save.meta: expected an object',
  ]);
  const withScores = (list: unknown): readonly string[] =>
    issuesOf((document) => {
      at(document, 'scores')['bugHunt'] = { arcade: list };
    });
  expect(withScores([entry('ABC', 5), entry('ABD', 9)]).join()).toContain('sorted');
  expect(withScores([...FULL, entry('ABC', 1)]).join()).toContain('at most 10');
  expect(withScores([{ ...entry('abc', 5) }]).join()).toContain('initials');
  expect(withScores([{ ...entry('ABC', 0) }]).join()).toContain('score');
  expect(withScores([{ ...entry('ABC', 3), date: '04.11.2026' }]).join()).toContain('date');
  expect(withScores([7]).join()).toContain('expected an object');
});

test('qualifies: positive and better than the last of a full list', () => {
  expect(qualifiesForTop10([], 0)).toBe(false);
  expect(qualifiesForTop10([], 1)).toBe(true);
  expect(qualifiesForTop10(FULL, 10)).toBe(false);
  expect(qualifiesForTop10(FULL, 11)).toBe(true);
  expect(qualifiesForTop10(FULL.slice(0, 9), 1)).toBe(true);
});

test('insert is stable for equal scores, truncates to ten and reports the rank', () => {
  const list = [entry('AAA', 50), entry('BBB', 30)];
  expect(insertTop10(list, entry('NEW', 30))).toEqual({
    entries: [entry('AAA', 50), entry('BBB', 30), entry('NEW', 30)],
    rank: 3,
  });
  expect(insertTop10(list, entry('TOP', 99)).rank).toBe(1);
  const full = insertTop10(FULL, entry('MID', 55));
  expect(full.rank).toBe(6);
  expect(full.entries).toHaveLength(TOP10_SIZE);
  expect(full.entries.at(-1)?.score).toBe(20);
});

test('best score is 0 for an empty list', () => {
  expect(bestScore([])).toBe(0);
  expect(bestScore(FULL)).toBe(100);
});
