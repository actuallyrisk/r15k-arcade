import { closeRng, nextFloat, nextInt, openRng } from '@r15k/engine';
import { expect, test } from 'vitest';
import { fallSeconds, spawnIntervalSeconds } from './difficulty.ts';
import { advanceSpawn, spawnKind } from './spawn.ts';
import { DT, makeItem, playingState, runSteps } from './test-support/states.ts';

test('golden bugs come first, bombs only after the 2 s grace time, bugs otherwise', () => {
  expect(spawnKind(0, 0)).toBe('golden');
  expect(spawnKind(0.0699, 0)).toBe('golden');
  expect(spawnKind(0.07, 2)).toBe('bug');
  expect(spawnKind(0.07, 2.01)).toBe('bomb');
  expect(spawnKind(0.2699, 60)).toBe('bomb');
  expect(spawnKind(0.27, 60)).toBe('bug');
  expect(spawnKind(0.9999, 60)).toBe('bug');
});

test('the spawn timer runs down without drawing random numbers', () => {
  const state = playingState({ spawnSeconds: 0.5, items: [makeItem({ id: 3 })], nextItemId: 4 });
  const outcome = advanceSpawn(state, DT);
  expect(outcome).toEqual({
    spawnSeconds: 0.5 - DT,
    nextItemId: 4,
    rng: state.rng,
    spawned: undefined,
    items: state.items,
  });
});

test('a spawn draws kind, interval, position, fall time and wiggle phase in this order', () => {
  const kept = makeItem({ id: 4 });
  const state = playingState({ spawnSeconds: DT, playTicks: 3600, nextItemId: 5, items: [kept] });
  const cursor = openRng(state.rng);
  const kind = spawnKind(nextFloat(cursor), 30);
  const interval = spawnIntervalSeconds(0.5, nextFloat(cursor));
  const x = 3 + nextInt(cursor, 223);
  const itemFall = fallSeconds({ progress: 0.5, jitter: nextFloat(cursor), kind });
  const animSeconds = nextFloat(cursor) * 0.4;
  const expected = { id: 5, kind, x, fall: 0, fallSeconds: itemFall, animSeconds };
  expect(advanceSpawn(state, DT)).toEqual({
    spawnSeconds: interval,
    nextItemId: 6,
    rng: closeRng(cursor),
    spawned: expected,
    items: [kept, expected],
  });
});

test('spawned items stay inside the field margins and fall 1.65 to 4.13 s', () => {
  const { state, events } = runSteps(playingState({ spawnSeconds: 0, playTicks: 0 }), 7199);
  const spawns = events.filter((event) => event.kind === 'spawn');
  expect(spawns.length).toBeGreaterThan(80);
  expect(spawns.map((event) => event.itemId)).toEqual(spawns.map((_, index) => index + 1));
  expect(state.nextItemId).toBe(spawns.length + 1);
  for (const item of state.items) {
    expect(item.x).toBeGreaterThanOrEqual(3);
    expect(item.x + 11).toBeLessThanOrEqual(237);
    expect(item.fallSeconds).toBeGreaterThanOrEqual(1.65 / 1.35);
    expect(item.fallSeconds).toBeLessThanOrEqual(99 / 24);
  }
});

test('no bomb spawns in the first two seconds of play', () => {
  const { events } = runSteps(playingState({ spawnSeconds: 0, playTicks: 0 }), 240);
  expect(events.filter((event) => event.kind === 'spawn').length).toBeGreaterThan(1);
  expect(events.some((event) => event.kind === 'spawn' && event.itemKind === 'bomb')).toBe(false);
});
