import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { formatFiles, normalisePath, selectFiles } from './format-files.ts';

const FILES = ['README.md', 'packages/ui/src/index.ts', 'packages/ui-extra/a.ts', 'tools/src/x.ts'];

test.each([
  ['packages/ui', 'packages/ui'],
  ['./packages/ui/', 'packages/ui'],
  ['packages\\ui\\src', 'packages/ui/src'],
  ['.', ''],
  ['./', ''],
])('normalisePath(%j) is %j', (input, expected) => {
  expect(normalisePath(input)).toBe(expected);
});

test('without paths every file is selected', () => {
  expect(selectFiles(FILES, [])).toEqual(FILES);
  expect(selectFiles(FILES, ['.'])).toEqual(FILES);
});

test('a path selects the files at and below it, never a sibling with the same prefix', () => {
  expect(selectFiles(FILES, ['packages/ui'])).toEqual(['packages/ui/src/index.ts']);
  expect(selectFiles(FILES, ['README.md', 'tools'])).toEqual(['README.md', 'tools/src/x.ts']);
});

let root = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'r15k-'));
  writeFileSync(join(root, '.prettierrc.json'), '{ "singleQuote": true, "semi": true }\n');
  writeFileSync(join(root, '.prettierignore'), 'generated.ts\n');
  writeFileSync(join(root, 'messy.ts'), 'const a = "x"\n');
  writeFileSync(join(root, 'clean.ts'), "const b = 'y';\n");
  writeFileSync(join(root, 'generated.ts'), 'const c = "z"\n');
  writeFileSync(join(root, 'notes.unknown-format'), 'no parser   for this\n');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const ALL = ['clean.ts', 'generated.ts', 'messy.ts', 'notes.unknown-format'];

test('check reports unformatted files and skips ignored files and files without a parser', async () => {
  const outcome = await formatFiles({ mode: 'check', files: ALL, root });
  expect(outcome).toEqual({
    checked: ['clean.ts', 'messy.ts'],
    unformatted: ['messy.ts'],
    written: [],
  });
  expect(readFileSync(join(root, 'messy.ts'), 'utf8')).toBe('const a = "x"\n');
});

test('write rewrites only the files that change, after which check passes', async () => {
  const written = await formatFiles({ mode: 'write', files: ALL, root });
  expect(written.written).toEqual(['messy.ts']);
  expect(readFileSync(join(root, 'messy.ts'), 'utf8')).toBe("const a = 'x';\n");
  expect(readFileSync(join(root, 'generated.ts'), 'utf8')).toBe('const c = "z"\n');
  const checked = await formatFiles({ mode: 'check', files: ALL, root });
  expect(checked.unformatted).toEqual([]);
});
