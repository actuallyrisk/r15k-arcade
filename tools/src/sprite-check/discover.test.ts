import { expect, test } from 'vitest';
import { discoverSpriteFiles, exportedSheets, isFileInScope } from './discover.ts';

test('sprite files are the sprites folders of packages, games and apps, without tests', () => {
  const files = [
    'games/bug-hunt/src/sprites/items.ts',
    'apps/arcade/src/sprites/app-icon.ts',
    'games/bug-hunt/src/sprites/cat.ts',
    'games/bug-hunt/src/sprites/cat.test.ts',
    'games/bug-hunt/src/sprites/nested/x.ts',
    'games/bug-hunt/src/view/sprite-sheets.ts',
    'packages/ui/src/fonts/r15k-5/index.ts',
    'packages/ui/src/sprites/cursor.ts',
    'tools/src/sprites/x.ts',
  ];
  expect(discoverSpriteFiles(files)).toEqual([
    { path: 'apps/arcade/src/sprites/app-icon.ts', owner: 'arcade' },
    { path: 'games/bug-hunt/src/sprites/cat.ts', owner: 'bug-hunt' },
    { path: 'games/bug-hunt/src/sprites/items.ts', owner: 'bug-hunt' },
    { path: 'packages/ui/src/sprites/cursor.ts', owner: 'ui' },
  ]);
});

test('a scoped run imports only the files whose package can hold a requested id', () => {
  const cat = { path: 'games/bug-hunt/src/sprites/cat.ts', owner: 'bug-hunt' };
  const icon = { path: 'apps/arcade/src/sprites/app-icon.ts', owner: 'arcade' };
  expect(isFileInScope(cat, undefined)).toBe(true);
  expect(isFileInScope(cat, new Set(['bug-hunt-cat', 'bug-hunt-items']))).toBe(true);
  expect(isFileInScope(icon, new Set(['bug-hunt-cat', 'bug-hunt-items']))).toBe(false);
  expect(isFileInScope(cat, new Set(['r15k-5', 'r15k-8']))).toBe(false);
  expect(isFileInScope(icon, new Set(['arcade-app-icon']))).toBe(true);
});

test('only exports shaped like sprite sheets count as sheets', () => {
  const sheet = { id: 'bug-hunt-cat', sprites: {} };
  const exports = {
    CAT_SPRITE_SHEET: sheet,
    TUNING: { id: 3 },
    NAME: 'x',
    LIST: [],
    NOTHING: null,
  };
  expect(exportedSheets(exports)).toEqual([sheet]);
  expect(exportedSheets(undefined)).toEqual([]);
});
