import { expect, test } from 'vitest';
import { parseReplay } from './replay-io.ts';
import type { Replay } from './replay.ts';

const VALID: Replay = {
  format: 'r15k-replay',
  version: 1,
  game: 'bug-hunt',
  mode: 'arcade',
  contentVersion: 1,
  seed: 4294967295,
  stepHz: 120,
  steps: 100,
  inputs: [
    [0, 1, -1],
    [5, 0, 0],
    [99, -1, 216],
  ],
  finalHash: '0123abcd',
  finalScore: 0,
  note: '',
};

/** The problems reported for the valid replay with some fields replaced. */
const problemsWith = (overrides: Readonly<Record<string, unknown>>): readonly string[] => {
  const result = parseReplay({ ...VALID, ...overrides });
  return result.ok ? [] : result.error;
};

test('a valid replay parses to an equal value with the keys in file order', () => {
  const result = parseReplay(JSON.parse(JSON.stringify(VALID)));
  expect(result).toEqual({ ok: true, value: VALID });
  expect(result.ok && Object.keys(result.value)).toEqual(Object.keys(VALID));
  expect(parseReplay({ ...VALID, inputs: [] })).toEqual({
    ok: true,
    value: { ...VALID, inputs: [] },
  });
});

test('anything but an object is rejected', () => {
  for (const value of [undefined, null, 3, 'replay', [VALID]]) {
    expect(parseReplay(value)).toEqual({ ok: false, error: ['expected a replay object'] });
  }
});

test('every header field is checked', () => {
  expect(problemsWith({ format: 'replay' })).toEqual(["format: expected 'r15k-replay'"]);
  expect(problemsWith({ version: 2 })).toEqual(['version: expected 1']);
  expect(problemsWith({ game: 'pong' })).toEqual(["game: expected 'bug-hunt'"]);
  expect(problemsWith({ mode: 'zen' })).toEqual(['mode: expected one of arcade']);
  expect(problemsWith({ mode: 7 })).toEqual(['mode: expected one of arcade']);
  expect(problemsWith({ contentVersion: 0 })).toEqual(['contentVersion: expected an integer ≥ 1']);
  expect(problemsWith({ seed: -1 })).toEqual(['seed: expected an integer in 0…4294967295']);
  expect(problemsWith({ seed: 2 ** 32 })).toEqual(['seed: expected an integer in 0…4294967295']);
  expect(problemsWith({ stepHz: 60 })).toEqual(['stepHz: expected 120']);
  expect(problemsWith({ finalHash: '0123ABCD' })).toEqual([
    'finalHash: expected 8 lower-case hex digits',
  ]);
  expect(problemsWith({ finalHash: 12 })).toEqual(['finalHash: expected 8 lower-case hex digits']);
  expect(problemsWith({ finalScore: 1.5 })).toEqual(['finalScore: expected an integer ≥ 0']);
  expect(problemsWith({ note: undefined })).toEqual(['note: expected a string']);
});

test('numbers must be safe integers', () => {
  expect(problemsWith({ steps: '100' })).toEqual(['steps: expected an integer ≥ 0']);
  expect(problemsWith({ steps: Number.MAX_SAFE_INTEGER + 1 })).toEqual([
    'steps: expected an integer ≥ 0',
  ]);
  expect(problemsWith({ finalScore: Number.NaN })).toEqual(['finalScore: expected an integer ≥ 0']);
});

test('unknown fields are reported', () => {
  expect(problemsWith({ score: 3, extra: true })).toEqual([
    'score: unknown field',
    'extra: unknown field',
  ]);
});

test('input entries are triples with increasing ticks below steps', () => {
  expect(problemsWith({ inputs: {} })).toEqual(['inputs: expected an array']);
  expect(problemsWith({ inputs: [[0, 1]] })).toEqual(['inputs[0]: expected [tick, move, aimX]']);
  expect(problemsWith({ inputs: ['0,1,-1'] })).toEqual(['inputs[0]: expected [tick, move, aimX]']);
  const increasing = 'tick: expected an integer in 6…99 (strictly increasing, below steps)';
  expect(
    problemsWith({
      inputs: [
        [5, 1, -1],
        [5, 0, -1],
      ],
    }),
  ).toEqual([`inputs[1]: ${increasing}`]);
  expect(problemsWith({ inputs: [[100, 1, -1]] })).toEqual([
    'inputs[0]: tick: expected an integer in 0…99 (strictly increasing, below steps)',
  ]);
  expect(problemsWith({ inputs: [[-1, 1, -1]] })).toHaveLength(1);
});

test('moves and aims are checked per entry and every problem is listed', () => {
  const problems = problemsWith({
    inputs: [
      [0, 2, -1],
      [1, 0, -2],
      [2, 0, 217],
      [3, 0, 1.5],
      [4, -1, -1],
    ],
    note: 1,
  });
  expect(problems).toEqual([
    'inputs[0]: move: expected -1, 0 or 1',
    'inputs[1]: aimX: expected -1 or an integer in 0…216',
    'inputs[2]: aimX: expected -1 or an integer in 0…216',
    'inputs[3]: aimX: expected -1 or an integer in 0…216',
    'note: expected a string',
  ]);
});

test('without a valid step count the entry ticks are only checked for order', () => {
  expect(problemsWith({ steps: -1, inputs: [[500, 0, 1]] })).toEqual([
    'steps: expected an integer ≥ 0',
  ]);
});
