import { expect, test } from 'vitest';
import { botInput } from './bot.ts';
import { comboMultiplier } from './combo.ts';
import { createInitialState } from './create.ts';
import { hashState } from './hash.ts';
import { NO_INPUT } from './input.ts';
import type { BugHuntInput } from './input.ts';
import type { BugHuntState } from './state.ts';
import { step } from './step.ts';
import { deepFreeze, DT, makeItem, playingState, runSteps } from './test-support/states.ts';

/** Plays a whole bot round from the initial state, checking a property after every step. */
const playBotRound = (seed: number, check: (state: BugHuntState) => void): BugHuntState => {
  let state = createInitialState({ seed, mode: 'arcade' });
  while (state.phase !== 'ended') {
    state = step(state, botInput(state), DT).state;
    check(state);
  }
  return state;
};

test('the step accepts only the fixed 120 Hz step', () => {
  const state = playingState();
  expect(() => step(state, NO_INPUT, 1 / 60)).toThrow(/dt must be/);
  expect(() => step(state, NO_INPUT, 0.008)).toThrow(/dt must be/);
});

test('the countdown shows 3, 2 and 1 for 0.6 s each, then "go" and the first spawn delay', () => {
  const { state, events } = runSteps(createInitialState({ seed: 1, mode: 'arcade' }), 216);
  expect(events).toEqual([
    { kind: 'countdown', digit: 3, tick: 0 },
    { kind: 'countdown', digit: 2, tick: 72 },
    { kind: 'countdown', digit: 1, tick: 144 },
    { kind: 'go', tick: 215 },
  ]);
  expect(state).toMatchObject({ phase: 'playing', countdownTicks: 0, playTicks: 0, tick: 216 });
  expect(state.spawnSeconds).toBe(0.3);
  expect(state.items).toEqual([]);
});

test('the cat already moves during the countdown', () => {
  const moved = runSteps(createInitialState({ seed: 1, mode: 'arcade' }), 10, {
    move: -1,
    aimX: undefined,
  });
  expect(moved.state.phase).toBe('countdown');
  expect(moved.state.cat.x).toBeCloseTo(108 - 10 * 225 * DT, 9);
});

test('the first item spawns 0.3 s after "go"', () => {
  const afterGo = runSteps(createInitialState({ seed: 1, mode: 'arcade' }), 216).state;
  const { events } = runSteps(afterGo, 40);
  const firstSpawn = events.find((event) => event.kind === 'spawn');
  expect(firstSpawn).toMatchObject({ itemId: 1 });
  expect(firstSpawn?.tick).toBeGreaterThanOrEqual(216 + 35);
  expect(firstSpawn?.tick).toBeLessThanOrEqual(216 + 36);
});

test('a spawned item already falls in the step it spawns', () => {
  const { state, events } = step(
    playingState({ spawnSeconds: DT / 2, nextItemId: 9 }),
    NO_INPUT,
    DT,
  );
  expect(events).toMatchObject([{ kind: 'spawn', itemId: 9 }]);
  const [item] = state.items;
  expect(item?.id).toBe(9);
  expect(item?.fall).toBe(DT / (item?.fallSeconds ?? 1));
  expect(state.nextItemId).toBe(10);
  expect(state.rng).not.toEqual(playingState().rng);
});

test('the last five seconds tick once each and the round ends after 60 s', () => {
  const stats = { ...playingState().stats, bugsCaught: 2 };
  const start = playingState({ playTicks: 7200 - 601, score: 12, stats, spawnSeconds: 99 });
  const { state, events } = runSteps(start, 601);
  expect(events).toEqual([
    { kind: 'time-tick', secondsLeft: 5, tick: start.tick },
    { kind: 'time-tick', secondsLeft: 4, tick: start.tick + 120 },
    { kind: 'time-tick', secondsLeft: 3, tick: start.tick + 240 },
    { kind: 'time-tick', secondsLeft: 2, tick: start.tick + 360 },
    { kind: 'time-tick', secondsLeft: 1, tick: start.tick + 480 },
    { kind: 'round-end', score: 12, stats, tick: start.tick + 600 },
  ]);
  expect(state).toMatchObject({ phase: 'ended', playTicks: 7200, items: [] });
});

test('the round end clears the items and an ended round only counts ticks', () => {
  const start = playingState({ playTicks: 7199, items: [makeItem({ id: 1, fall: 0.5 })] });
  const ended = step(start, NO_INPUT, DT).state;
  expect(ended).toMatchObject({ phase: 'ended', playTicks: 7200, items: [], tick: start.tick + 1 });
  const after = step(ended, { move: 1, aimX: 3 }, DT);
  expect(after.events).toEqual([]);
  expect(after.state).toEqual({ ...ended, tick: ended.tick + 1 });
});

test('the step never mutates its arguments', () => {
  let state = createInitialState({ seed: 5, mode: 'arcade' });
  for (let index = 0; index < 1500; index += 1) {
    const input: BugHuntInput =
      index % 200 === 0 ? { move: 0, aimX: index % 216 } : botInput(state);
    const before = JSON.stringify([state, input]);
    const frozenState = deepFreeze(state);
    const result = step(frozenState, deepFreeze(input), DT);
    expect(JSON.stringify([frozenState, input])).toBe(before);
    state = result.state;
  }
  expect(state.items.length).toBeGreaterThan(0);
});

test('the same seed and inputs give the same states; the multiplier follows the streak', () => {
  const hashes: string[] = [];
  const first = playBotRound(11, (state) => {
    hashes.push(hashState(state));
    expect(state.multiplier).toBe(comboMultiplier(state.streak));
    expect(state.score).toBeGreaterThanOrEqual(0);
  });
  let index = 0;
  const second = playBotRound(11, (state) => {
    expect(hashState(state)).toBe(hashes[index]);
    index += 1;
  });
  expect(second).toEqual(first);
  expect(first.tick).toBe(216 + 7200);
  expect(first.score).toBeGreaterThan(0);
});
