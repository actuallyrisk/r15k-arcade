import { expect, test } from 'vitest';
import { CONTENT_VERSION } from '../content/version.ts';
import { NO_INPUT } from './input.ts';
import { appendInput, inputAt, recordBotReplay, runReplay } from './replay.ts';
import type { Replay, ReplayInputEntry } from './replay.ts';

const ENTRIES: readonly ReplayInputEntry[] = [
  [10, 1, -1],
  [20, 0, 50],
  [30, -1, 7],
];

test('input entries are appended only for move changes and new aims', () => {
  const empty: readonly ReplayInputEntry[] = [];
  expect(appendInput(empty, 0, NO_INPUT)).toBe(empty);
  const moving = appendInput(empty, 3, { move: 1, aimX: undefined });
  expect(moving).toEqual([[3, 1, -1]]);
  expect(appendInput(moving, 4, { move: 1, aimX: undefined })).toBe(moving);
  expect(appendInput(moving, 5, { move: 1, aimX: 12.6 })).toEqual([
    [3, 1, -1],
    [5, 1, 13],
  ]);
  expect(appendInput(moving, 6, { move: 0, aimX: 400 })).toEqual([
    [3, 1, -1],
    [6, 0, 216],
  ]);
  expect(moving).toEqual([[3, 1, -1]]);
});

test('a move holds until the next entry and an aim applies only in its own step', () => {
  expect(inputAt(ENTRIES, 0, 0)).toEqual({ input: NO_INPUT, cursor: 0 });
  expect(inputAt(ENTRIES, 10, 0)).toEqual({ input: { move: 1, aimX: undefined }, cursor: 1 });
  expect(inputAt(ENTRIES, 15, 1)).toEqual({ input: { move: 1, aimX: undefined }, cursor: 1 });
  expect(inputAt(ENTRIES, 20, 1)).toEqual({ input: { move: 0, aimX: 50 }, cursor: 2 });
  expect(inputAt(ENTRIES, 21, 2)).toEqual({ input: { move: 0, aimX: undefined }, cursor: 2 });
  expect(inputAt(ENTRIES, 30, 2)).toEqual({ input: { move: -1, aimX: 7 }, cursor: 3 });
  expect(inputAt(ENTRIES, 99, 3)).toEqual({ input: { move: -1, aimX: undefined }, cursor: 3 });
});

test('reading from an earlier cursor skips the entries that are already over', () => {
  expect(inputAt(ENTRIES, 25, 0)).toEqual({ input: { move: 0, aimX: undefined }, cursor: 2 });
  expect(inputAt([], 25, 0)).toEqual({ input: NO_INPUT, cursor: 0 });
});

test('a recorded bot round describes a whole Arcade round and replays to its hash', () => {
  const replay = recordBotReplay({ seed: 1, note: 'keyboard bot' });
  expect(replay).toMatchObject({
    format: 'r15k-replay',
    version: 1,
    game: 'bug-hunt',
    mode: 'arcade',
    contentVersion: CONTENT_VERSION,
    seed: 1,
    stepHz: 120,
    steps: 216 + 7200,
    note: 'keyboard bot',
  });
  expect(replay.inputs.length).toBeGreaterThan(20);
  expect(replay.inputs.every(([, , aimX]) => aimX === -1)).toBe(true);
  const run = runReplay(replay);
  expect(run).toMatchObject({ hash: replay.finalHash, score: replay.finalScore });
  expect(run.state.phase).toBe('ended');
  expect(recordBotReplay({ seed: 1, note: 'keyboard bot', input: 'bot' })).toEqual(replay);
});

test('an idle round records no input and still catches what falls onto the cat', () => {
  const replay = recordBotReplay({ seed: 2, note: 'idle', input: 'idle' });
  expect(replay.inputs).toEqual([]);
  const run = runReplay(replay);
  expect(run.hash).toBe(replay.finalHash);
  expect(run.state.stats.misses).toBeGreaterThan(run.state.stats.bugsCaught);
  expect(run.state.cat.x).toBe(108);
});

test('a pointer bot round records one aim per target and no moves', () => {
  const replay = recordBotReplay({ seed: 3, note: 'pointer bot', input: 'pointer-bot' });
  expect(replay.inputs.length).toBeGreaterThan(20);
  expect(replay.inputs.every(([, move, aimX]) => move === 0 && aimX >= 0 && aimX <= 216)).toBe(
    true,
  );
  const run = runReplay(replay);
  expect(run.hash).toBe(replay.finalHash);
  expect(run.score).toBe(replay.finalScore);
  expect(run.state.stats.bugsCaught).toBeGreaterThan(run.state.stats.misses);
});

test('a replay with changed inputs or seed ends in a different state', () => {
  const replay = recordBotReplay({ seed: 1, note: 'keyboard bot' });
  const changedSeed: Replay = { ...replay, seed: 99 };
  expect(runReplay(changedSeed).hash).not.toBe(replay.finalHash);
  const shortened: Replay = { ...replay, steps: 1000 };
  expect(runReplay(shortened).state.phase).toBe('playing');
});
