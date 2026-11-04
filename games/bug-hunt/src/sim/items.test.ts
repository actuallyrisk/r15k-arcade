import { expect, test } from 'vitest';
import type { SimEvent } from './events.ts';
import { NO_INPUT } from './input.ts';
import type { BugHuntState, Item } from './state.ts';
import { step } from './step.ts';
import { catWith, DT, makeItem, playingState } from './test-support/states.ts';

/** An item that enters the catch window in the next step (fall 0.875 + 1/120). */
const entering = (overrides: Partial<Item> & Pick<Item, 'id'>): Item =>
  makeItem({ fall: 0.875, x: 100, ...overrides });

/** An item that reaches the ground in the next step. */
const landing = (overrides: Partial<Item> & Pick<Item, 'id'>): Item =>
  makeItem({ fall: 0.995, x: 10, ...overrides });

/** One step of a playing state with the cat standing under x 100. */
const resolve = (overrides: Partial<BugHuntState>): { state: BugHuntState; events: SimEvent[] } => {
  const result = step(playingState({ cat: catWith({ x: 94 }), ...overrides }), NO_INPUT, DT);
  return { state: result.state, events: [...result.events] };
};

test('a caught bug scores 1, starts the streak and makes the cat happy', () => {
  const { state, events } = resolve({ items: [entering({ id: 1 })], score: 3 });
  expect(events).toEqual([
    {
      kind: 'catch',
      itemId: 1,
      itemKind: 'bug',
      points: 1,
      multiplier: 1,
      x: 100,
      fall: 0.875 + DT,
    },
  ]);
  expect(state).toMatchObject({ score: 4, streak: 1, multiplier: 1, items: [] });
  expect(state.cat.happySeconds).toBe(0.25);
  expect(state.stats).toMatchObject({ bugsCaught: 1, goldenCaught: 0, bestStreak: 1 });
});

test('a caught golden bug scores 5 times the multiplier', () => {
  const golden = entering({ id: 2, kind: 'golden' });
  const { state, events } = resolve({ items: [golden], streak: 12, multiplier: 3 });
  expect(events).toMatchObject([{ kind: 'catch', itemKind: 'golden', points: 15, multiplier: 3 }]);
  expect(state.cat.happySeconds).toBe(0.45);
  expect(state.stats).toMatchObject({ bugsCaught: 0, goldenCaught: 1, bestStreak: 13 });
});

test('the 5th, 10th and 20th catch reach the next stage and already score it', () => {
  const stageUp = (streak: number, multiplier: 1 | 2 | 3): readonly SimEvent[] =>
    resolve({ items: [entering({ id: 1 })], streak, multiplier }).events;
  expect(stageUp(4, 1)).toMatchObject([
    { kind: 'combo-stage', multiplier: 2 },
    { kind: 'catch', points: 2, multiplier: 2 },
  ]);
  expect(stageUp(9, 2)).toMatchObject([{ kind: 'combo-stage', multiplier: 3 }, { points: 3 }]);
  expect(stageUp(19, 3)).toMatchObject([{ kind: 'combo-stage', multiplier: 4 }, { points: 4 }]);
  expect(resolve({ items: [entering({ id: 1 })], streak: 30, multiplier: 4 }).events).toMatchObject(
    [{ kind: 'catch', points: 4 }],
  );
});

test('a caught bomb costs 3 points, resets the combo and startles the cat', () => {
  const bomb = entering({ id: 5, kind: 'bomb' });
  const cat = catWith({ x: 94, happySeconds: 0.2 });
  const { state, events } = resolve({ items: [bomb], score: 10, streak: 7, multiplier: 2, cat });
  expect(events).toEqual([
    { kind: 'combo-reset', previous: 2 },
    { kind: 'bomb', itemId: 5, penalty: 3, x: 100, fall: 0.875 + DT },
  ]);
  expect(state).toMatchObject({ score: 7, streak: 0, multiplier: 1 });
  expect(state.cat).toMatchObject({ startleSeconds: 0.6, happySeconds: 0 });
  expect(state.stats.bombsCaught).toBe(1);
});

test('the score never drops below 0 and a 1x combo has nothing to reset', () => {
  const bomb = entering({ id: 5, kind: 'bomb' });
  const { state, events } = resolve({ items: [bomb], score: 2, streak: 3 });
  expect(events).toEqual([{ kind: 'bomb', itemId: 5, penalty: 3, x: 100, fall: 0.875 + DT }]);
  expect(state).toMatchObject({ score: 0, streak: 0, multiplier: 1 });
});

test('a bug on the ground is a miss and breaks the combo', () => {
  const golden = landing({ id: 8, kind: 'golden' });
  const { state, events } = resolve({ items: [golden], streak: 22, multiplier: 4 });
  expect(events).toEqual([
    { kind: 'combo-reset', previous: 4 },
    { kind: 'miss', itemId: 8, itemKind: 'golden', x: 10 },
  ]);
  expect(state).toMatchObject({ streak: 0, multiplier: 1, items: [] });
  expect(state.stats.misses).toBe(1);
  expect(resolve({ items: [landing({ id: 9 })] }).events).toEqual([
    { kind: 'miss', itemId: 9, itemKind: 'bug', x: 10 },
  ]);
});

test('a bomb on the ground is dodged and keeps the combo', () => {
  const bomb = landing({ id: 4, kind: 'bomb' });
  const { state, events } = resolve({ items: [bomb], streak: 6, multiplier: 2 });
  expect(events).toEqual([{ kind: 'dodge', itemId: 4, x: 10 }]);
  expect(state).toMatchObject({ streak: 6, multiplier: 2, items: [] });
  expect(state.stats.bombsDodged).toBe(1);
});

test('items above the catch window or beside the cat keep falling', () => {
  const high = makeItem({ id: 1, x: 100, fall: 0.5 });
  const beside = makeItem({ id: 2, x: 150, fall: 0.95, kind: 'bomb' });
  const { state, events } = resolve({ items: [high, beside] });
  expect(events).toEqual([]);
  expect(state.items).toEqual([
    { ...high, fall: 0.5 + DT, animSeconds: DT },
    { ...beside, fall: 0.95 + DT, animSeconds: DT },
  ]);
});

test('two items in one step: a stage-up catch followed by a bomb', () => {
  const items = [entering({ id: 1 }), entering({ id: 2, kind: 'bomb', x: 98 })];
  const { state, events } = resolve({ items, streak: 4, score: 5 });
  expect(events).toEqual([
    { kind: 'combo-stage', multiplier: 2 },
    {
      kind: 'catch',
      itemId: 1,
      itemKind: 'bug',
      points: 2,
      multiplier: 2,
      x: 100,
      fall: 0.875 + DT,
    },
    { kind: 'combo-reset', previous: 2 },
    { kind: 'bomb', itemId: 2, penalty: 3, x: 98, fall: 0.875 + DT },
  ]);
  expect(state).toMatchObject({ score: 4, streak: 0, multiplier: 1 });
  expect(state.stats).toMatchObject({ bugsCaught: 1, bombsCaught: 1, bestStreak: 5 });
});

test('two catches in one step cross each stage once, a miss then resets the running multiplier', () => {
  const items = [entering({ id: 1 }), entering({ id: 2, x: 96 }), landing({ id: 3 })];
  const { state, events } = resolve({ items, streak: 3 });
  expect(events.map((event) => event.kind)).toEqual([
    'catch',
    'combo-stage',
    'catch',
    'combo-reset',
    'miss',
  ]);
  expect(events[1]).toEqual({ kind: 'combo-stage', multiplier: 2 });
  expect(state).toMatchObject({ score: 3, streak: 0, multiplier: 1 });
});
