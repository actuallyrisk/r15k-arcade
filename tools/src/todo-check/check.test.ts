import { expect, test } from 'vitest';
import { findTodoMarkers, isScannedFile } from './check.ts';

// Marker words are assembled, so this file contains none of them literally.
const TASK = 'TO' + 'DO';
const REPAIR = 'FI' + 'XME';

test.each([
  [`// ${TASK}: tidy up`, 4],
  [`/* ${REPAIR} */`, 4],
  [TASK, 1],
  [`x ${TASK}(123)`, 3],
  [`x ${TASK}(#)`, 3],
  [`x ${TASK} (#12)`, 3],
  [`(${REPAIR})`, 2],
])('%j is a marker without an issue number at column %i', (line, column) => {
  expect(findTodoMarkers('a.ts', line)).toEqual([
    { file: 'a.ts', line: 1, column, marker: line.includes(TASK) ? TASK : REPAIR },
  ]);
});

test.each([
  [`// ${TASK}(#123): tidy up`],
  [`${REPAIR}(#7)`],
  ['pnpm todo-check'],
  ['to-do markers'],
  [`${TASK.toLowerCase()} list`],
  [`Todo and Fixme in prose`],
  [`${TASK}S`],
  [`MY${TASK}`],
])('%j passes', (line) => {
  expect(findTodoMarkers('a.ts', line)).toEqual([]);
});

test('findings carry their line numbers, several per line', () => {
  const text = ['first', `${TASK} and ${REPAIR}(#2) and ${REPAIR}`, '', `  ${TASK}`].join('\n');
  expect(findTodoMarkers('docs/x.md', text)).toEqual([
    { file: 'docs/x.md', line: 2, column: 1, marker: TASK },
    { file: 'docs/x.md', line: 2, column: 24, marker: REPAIR },
    { file: 'docs/x.md', line: 4, column: 3, marker: TASK },
  ]);
});

test.each([
  ['tools/src/a.ts', true],
  ['eslint.config.mjs', true],
  ['plugins/device/src/lib.rs', true],
  ['plugins/device/android/consumer-rules.pro', true],
  ['.github/workflows/ci.yml', true],
  ['apps/arcade/src-tauri/Info.plist', true],
  ['README.md', true],
  ['assets/goldens/ui-widgets--light.png', false],
  ['LICENSE', false],
  ['.node-version', false],
])('isScannedFile(%j) is %j', (file, isScanned) => {
  expect(isScannedFile(file)).toBe(isScanned);
});
