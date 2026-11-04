import { expect, test } from 'vitest';
import { computeInputHash, readSourceFiles } from './input-hash.ts';
import type { HashInputs } from './input-hash.ts';
import { ALL_SFX } from './sfx-sources.ts';

const INPUTS: HashInputs = {
  files: [
    { path: 'song-render/a.ts', text: 'export const A = 1;\n' },
    { path: 'songs/meow-house.json', text: '{ "bpm": 124 }\n' },
  ],
  sfx: ALL_SFX,
  encoderVersion: '0.7.0',
  nodeMajor: '24',
};

test('the hash is eight hex digits and the same for the same inputs', () => {
  const hash = computeInputHash(INPUTS);
  expect(hash).toMatch(/^[0-9a-f]{8}$/);
  expect(computeInputHash({ ...INPUTS })).toBe(hash);
});

test('neither the order of the files nor their line endings change the hash', () => {
  const hash = computeInputHash(INPUTS);
  expect(computeInputHash({ ...INPUTS, files: [...INPUTS.files].reverse() })).toBe(hash);
  const crlf = INPUTS.files.map((file) => ({ ...file, text: file.text.replaceAll('\n', '\r\n') }));
  expect(computeInputHash({ ...INPUTS, files: crlf })).toBe(hash);
});

test.each<readonly [string, Partial<HashInputs>]>([
  ['a changed source', { files: [{ path: 'song-render/a.ts', text: 'export const A = 2;\n' }] }],
  ['a renamed file', { files: [{ path: 'song-render/b.ts', text: 'export const A = 1;\n' }] }],
  ['a changed effect', { sfx: ALL_SFX.slice(1) }],
  ['another encoder version', { encoderVersion: '0.7.1' }],
  ['another Node major version', { nodeMajor: '26' }],
])('%s changes the hash', (_name, change) => {
  expect(computeInputHash({ ...INPUTS, ...change })).not.toBe(computeInputHash(INPUTS));
});

test('the source list holds every TypeScript file of the renderer with portable paths', () => {
  const files = readSourceFiles(import.meta.dirname, 'song-render').map((file) => file.path);
  expect(files).toContain('song-render/main.ts');
  expect(files).toContain('song-render/synth/voices.ts');
  expect(files).toContain('song-render/input-hash.test.ts');
  expect(files.every((path) => path.endsWith('.ts') && !path.includes('\\'))).toBe(true);
});
