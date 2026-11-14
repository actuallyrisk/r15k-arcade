import { expect, test } from 'vitest';
import { botInput } from './bot.ts';
import { botAimX, botTarget, escapeDirection } from './bot-target.ts';
import { NO_INPUT } from './input.ts';
import type { BugHuntState, Cat, Item } from './state.ts';
import { catWith, makeItem, playingState } from './test-support/states.ts';

/** The bot's input with the cat at `catX` and these items. */
const decide = (catX: number, items: readonly Item[]): ReturnType<typeof botInput> =>
  botInput(playingState({ cat: catWith({ x: catX }), items }));

test('without items the bot stands still', () => {
  expect(decide(100, [])).toBe(NO_INPUT);
  expect(botInput(createCountdownState())).toBe(NO_INPUT);
});

test('the bot runs towards the lowest reachable bug and stops within the dead zone', () => {
  const bug = makeItem({ id: 1, x: 150, fall: 0.2, fallSeconds: 3 });
  expect(decide(100, [bug])).toEqual({ move: 1, aimX: undefined });
  expect(decide(200, [bug])).toEqual({ move: -1, aimX: undefined });
  expect(decide(144 - 4, [bug])).toBe(NO_INPUT);
  expect(decide(144 + 4, [bug])).toBe(NO_INPUT);
  expect(decide(144 + 5, [bug])).toEqual({ move: -1, aimX: undefined });
});

test('the target is the reachable bug or golden bug that falls lowest, never a bomb', () => {
  const state = playingState({
    cat: catWith({ x: 100 }),
    items: [
      makeItem({ id: 1, x: 20, fall: 0.5, fallSeconds: 4 }),
      makeItem({ id: 2, x: 200, fall: 0.6, kind: 'golden', fallSeconds: 4 }),
      makeItem({ id: 3, x: 120, fall: 0.9, kind: 'bomb' }),
      makeItem({ id: 4, x: 3, fall: 0.97, fallSeconds: 2 }),
    ],
  });
  // Item 4 lands in 0.06 s, but the cat centre is 103.5 px away: unreachable at 225 px/s.
  expect(botTarget(state, 225)?.id).toBe(2);
  expect(botTarget(state, 2000)?.id).toBe(4);
  const tie = [makeItem({ id: 7, x: 50, fall: 0.4 }), makeItem({ id: 8, x: 60, fall: 0.4 })];
  expect(botTarget(playingState({ items: tie }), 225)?.id).toBe(7);
});

test('the aim centres the cat under the item and stays inside the field', () => {
  expect(botAimX(makeItem({ id: 1, x: 100 }))).toBe(94);
  expect(botAimX(makeItem({ id: 1, x: 3 }))).toBe(0);
  expect(botAimX(makeItem({ id: 1, x: 225 }))).toBe(216);
});

test('a bomb over the cat late in its fall makes the bot run away from it', () => {
  const fromLeft = makeItem({ id: 1, kind: 'bomb', x: 96, fall: 0.7 });
  expect(decide(100, [fromLeft])).toEqual({ move: 1, aimX: undefined });
  const fromRight = makeItem({ id: 1, kind: 'bomb', x: 110, fall: 0.8 });
  const bug = makeItem({ id: 2, x: 200, fall: 0.9, fallSeconds: 5 });
  expect(decide(100, [fromRight, bug])).toEqual({ move: -1, aimX: undefined });
});

test('early bombs are ignored and the bot waits instead of running under a late one', () => {
  const early = makeItem({ id: 1, kind: 'bomb', x: 100, fall: 0.69 });
  const bug = makeItem({ id: 2, x: 30, fall: 0.3, fallSeconds: 4 });
  expect(decide(100, [early, bug])).toEqual({ move: -1, aimX: undefined });
  // The catch zone 52…70 does not reach the bomb at 70, one step to the right it would.
  const late = makeItem({ id: 1, kind: 'bomb', x: 70, fall: 0.8 });
  const farBug = makeItem({ id: 2, x: 150, fall: 0.3, fallSeconds: 4 });
  expect(decide(49, [late, farBug])).toBe(NO_INPUT);
});

test('at a field edge the only escape is through the bomb', () => {
  const cat = (x: number): Cat => catWith({ x });
  expect(escapeDirection(cat(0), makeItem({ id: 1, x: 0 }))).toBe(1);
  expect(escapeDirection(cat(0), makeItem({ id: 1, x: 10 }))).toBe(1);
  expect(escapeDirection(cat(216), makeItem({ id: 1, x: 220 }))).toBe(-1);
  expect(escapeDirection(cat(216), makeItem({ id: 1, x: 230 }))).toBe(-1);
  expect(escapeDirection(cat(100), makeItem({ id: 1, x: 106 }))).toBe(1);
  expect(escapeDirection(cat(100), makeItem({ id: 1, x: 107 }))).toBe(-1);
});

/** A state in the countdown (no items yet). */
function createCountdownState(): BugHuntState {
  return playingState({ phase: 'countdown', countdownTicks: 100, playTicks: 0 });
}
