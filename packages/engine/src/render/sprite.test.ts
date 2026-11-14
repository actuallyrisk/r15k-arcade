import { expect, test } from 'vitest';
import { compileSpriteSheet, defineSpriteSheet } from './sprite.ts';
import { DEFAULT_SPRITE_LIMITS, validateSpriteSheet } from './sprite-validate.ts';
import type { SpriteSheetSource } from './sprite.ts';

const SHEET = defineSpriteSheet({
  id: 'test-sheet',
  sprites: {
    arrow: {
      width: 3,
      height: 2,
      frames: [
        ['ob.', 'wg.'],
        ['..o', '.k.'],
      ],
    },
    'dot-2': { width: 1, height: 1, frames: [['h']] },
  },
});

test('defineSpriteSheet returns its argument', () => {
  const sheet = { id: 'x', sprites: {} };
  expect(defineSpriteSheet(sheet)).toBe(sheet);
});

test('compiled frames hold slot indices row by row, mirrored frames reversed rows', () => {
  const compiled = compileSpriteSheet(SHEET);
  expect(compiled.arrow.name).toBe('arrow');
  expect(compiled.arrow.width).toBe(3);
  expect(compiled.arrow.height).toBe(2);
  expect(compiled.arrow.frames.map((frame) => Array.from(frame))).toEqual([
    [2, 3, 0, 1, 9, 0],
    [0, 0, 2, 0, 7, 0],
  ]);
  expect(compiled.arrow.mirroredFrames.map((frame) => Array.from(frame))).toEqual([
    [0, 3, 2, 0, 9, 1],
    [2, 0, 0, 0, 7, 0],
  ]);
  expect(Array.from(compiled['dot-2'].frames[0] ?? [])).toEqual([15]);
});

test('a valid sheet has no issues', () => {
  expect(validateSpriteSheet(SHEET)).toEqual([]);
  expect(DEFAULT_SPRITE_LIMITS).toEqual({ maxWidth: 64, maxHeight: 64, maxFrames: 16 });
});

test('every rule of the validator reports an issue with its location', () => {
  const sheet: SpriteSheetSource = {
    id: 'Bad_Sheet',
    sprites: {
      catSit: { width: 2, height: 1, frames: [['oo']] },
      shape: { width: 2, height: 2, frames: [['oo'], ['o', 'ooo'], ['..', '..'], ['ox', 'oo']] },
      huge: { width: 65, height: 0, frames: [] },
    },
  };
  expect(
    validateSpriteSheet(sheet).map((issue) => [issue.sprite, issue.frame, issue.message]),
  ).toEqual([
    ['', undefined, 'sheet id is not kebab-case'],
    ['catSit', undefined, 'sprite name is not kebab-case'],
    ['shape', 0, 'has 1 rows, expected 2'],
    ['shape', 1, 'row 0 has 1 characters, expected 2'],
    ['shape', 1, 'row 1 has 3 characters, expected 2'],
    ['shape', 2, 'has no opaque pixel'],
    ['shape', 3, "unknown characters 'x'"],
    ['huge', undefined, 'size 65×0 is outside 1…64 × 1…64'],
    ['huge', undefined, 'has 0 frames, expected 1…16'],
  ]);
});

test('custom limits apply', () => {
  const sheet = {
    id: 'small',
    sprites: { two: { width: 2, height: 1, frames: [['oo'], ['oo']] } },
  };
  const limits = { maxWidth: 1, maxHeight: 1, maxFrames: 1 };
  expect(validateSpriteSheet(sheet, limits).map((issue) => issue.message)).toEqual([
    'size 2×1 is outside 1…1 × 1…1',
    'has 2 frames, expected 1…1',
  ]);
});

test('compiling an invalid sheet throws with every issue', () => {
  const sheet = { id: 'broken', sprites: { dot: { width: 1, height: 1, frames: [['.'], ['z']] } } };
  expect(() => compileSpriteSheet(sheet)).toThrow(
    "invalid sprite sheet 'broken':\nbroken/dot frame 0: has no opaque pixel\nbroken/dot frame 1: unknown characters 'z'",
  );
});
