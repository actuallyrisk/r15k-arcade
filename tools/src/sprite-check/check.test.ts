import type { FontSource, SpriteSource } from '@r15k/engine';
import { expect, test } from 'vitest';
import {
  areFontsInScope,
  expectedSpriteIssues,
  fontIssues,
  parseScope,
  printSprite,
  sheetIssues,
  unknownIds,
} from './check.ts';
import type { LoadedSheet } from './check.ts';

/** A sprite with `frames` frames of a filled `width × height` box of ink. */
const box = (width: number, height: number, frames = 1): SpriteSource => ({
  width,
  height,
  frames: Array.from({ length: frames }, () =>
    Array.from({ length: height }, () => 'o'.repeat(width)),
  ),
});

const CAT: LoadedSheet = {
  file: 'games/bug-hunt/src/sprites/cat.ts',
  owner: 'bug-hunt',
  sheet: {
    id: 'bug-hunt-cat',
    sprites: {
      'cat-sit': box(24, 24),
      'cat-run': box(24, 24, 4),
      'cat-happy': box(24, 24),
      'cat-startle': box(24, 24),
    },
  },
};

const ITEMS: LoadedSheet = {
  file: 'games/bug-hunt/src/sprites/items.ts',
  owner: 'bug-hunt',
  sheet: {
    id: 'bug-hunt-items',
    sprites: { bug: box(11, 11, 2), 'golden-bug': box(11, 11, 2), bomb: box(11, 12, 2) },
  },
};

test('valid sheets with the expected frames and sizes pass in a scoped run', () => {
  const scope = parseScope('bug-hunt-cat,bug-hunt-items');
  expect(sheetIssues([CAT, ITEMS], scope)).toEqual([]);
  expect(expectedSpriteIssues([CAT, ITEMS], scope)).toEqual([]);
  expect(unknownIds(scope, { sheets: [CAT, ITEMS], fontIds: ['r15k-5'] })).toEqual([]);
});

test('an invalid sprite is reported with file, sheet, sprite and frame', () => {
  const broken: LoadedSheet = {
    ...CAT,
    sheet: {
      id: 'bug-hunt-cat',
      sprites: { 'cat-sit': { width: 2, height: 1, frames: [['oX']] } },
    },
  };
  const issues = sheetIssues([broken], undefined);
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatch(
    /^games\/bug-hunt\/src\/sprites\/cat\.ts: bug-hunt-cat\/cat-sit frame 0: /,
  );
});

test('a sheet id outside its package prefix and a duplicate id are reported', () => {
  const foreign: LoadedSheet = { ...ITEMS, owner: 'arcade' };
  const twice: LoadedSheet = { ...CAT, file: 'games/bug-hunt/src/sprites/cat-copy.ts' };
  expect(sheetIssues([foreign, CAT, twice], undefined)).toEqual([
    "games/bug-hunt/src/sprites/items.ts: sheet id 'bug-hunt-items' must start with 'arcade-'",
    "games/bug-hunt/src/sprites/cat-copy.ts: sheet id 'bug-hunt-cat' is also used in games/bug-hunt/src/sprites/cat.ts",
  ]);
});

test('wrong frame counts, wrong sizes and missing expected sprites are reported', () => {
  const wrong: LoadedSheet = {
    ...ITEMS,
    sheet: { id: 'bug-hunt-items', sprites: { bug: box(11, 11, 1), 'golden-bug': box(12, 11, 2) } },
  };
  expect(expectedSpriteIssues([wrong], parseScope('bug-hunt-items'))).toEqual([
    'bug-hunt-items/bug: 1 frame(s), expected 2',
    'bug-hunt-items/golden-bug: 12×11, expected 11×11',
    'expected sprite bug-hunt-items/bomb is missing',
  ]);
  expect(expectedSpriteIssues([], parseScope('arcade-app-icon'))).toEqual([
    'expected sprite arcade-app-icon/app-icon is missing',
  ]);
});

test('the scope restricts sheets, expectations and fonts, and unknown ids are named', () => {
  const scope = parseScope(' r15k-8 , ,bug-hunt-kat');
  expect(scope).toEqual(new Set(['r15k-8', 'bug-hunt-kat']));
  expect(parseScope(undefined)).toBeUndefined();
  expect(sheetIssues([{ ...ITEMS, owner: 'arcade' }], scope)).toEqual([]);
  expect(expectedSpriteIssues([], scope)).toEqual([]);
  expect(unknownIds(scope, { sheets: [CAT], fontIds: ['r15k-5', 'r15k-8'] })).toEqual([
    'bug-hunt-kat',
  ]);
  expect(areFontsInScope(scope)).toBe(true);
  expect(areFontsInScope(parseScope('bug-hunt-cat'))).toBe(false);
  expect(areFontsInScope(undefined)).toBe(true);
});

/** A font with the given glyphs (cell height 3). */
const font = (id: string, glyphs: Readonly<Record<string, string>>): FontSource => ({
  id,
  metrics: { capHeight: 2, ascent: 2, descent: 1, lineHeight: 4, letterSpacing: 1, spaceWidth: 2 },
  fallback: '?',
  glyphs,
});

test('fonts in scope are validated against the required characters', () => {
  const glyphs = { ' ': '..|..|..', '?': '##|.#|..', A: '##|##|..' };
  const complete = font('r15k-5', glyphs);
  expect(fontIssues([complete], { requiredChars: 'A? ', scope: undefined })).toEqual([]);
  const missing = fontIssues([complete], { requiredChars: 'AB', scope: undefined });
  expect(missing).toHaveLength(1);
  expect(missing[0]).toMatch(/^r15k-5: 'B' \(U\+0042\): /);
  expect(fontIssues([complete], { requiredChars: 'AB', scope: parseScope('r15k-8') })).toEqual([]);
});

test('a sprite prints frame by frame with a legend of slot names', () => {
  const sprite: SpriteSource = { width: 3, height: 1, frames: [['.ob'], ['bo.']] };
  expect(printSprite('bug-hunt-items', 'bug', sprite)).toEqual([
    'bug-hunt-items/bug frame 1 of 2 (3×1)',
    '.ob',
    '',
    'bug-hunt-items/bug frame 2 of 2 (3×1)',
    'bo.',
    '',
    'legend: . transparent, b blue, o ink',
  ]);
});
