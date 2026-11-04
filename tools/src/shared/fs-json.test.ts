import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { readJson, writeJson } from './fs-json.ts';

let folder = '';

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'r15k-'));
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

test('writeJson writes the two-space layout with a final newline and creates parent folders', () => {
  const file = join(folder, 'nested', 'value.json');
  writeJson(file, { name: 'r15k', list: [1, 2], empty: {} });
  expect(readFileSync(file, 'utf8')).toBe(
    '{\n  "name": "r15k",\n  "list": [\n    1,\n    2\n  ],\n  "empty": {}\n}\n',
  );
});

test('readJson returns what writeJson wrote', () => {
  const file = join(folder, 'round-trip.json');
  const value = { version: '0.1.0', flags: [true, false], nested: { text: 'Ä ß ←' } };
  writeJson(file, value);
  expect(readJson(file)).toEqual(value);
});
