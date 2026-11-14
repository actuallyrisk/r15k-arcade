import { hashCanonical, seedRng } from '@r15k/engine';
import { expect, test } from 'vitest';
import { CONTENT_VERSION } from '../content/version.ts';
import { isCaught } from './collision.ts';
import { comboMultiplier } from './combo.ts';
import { secondsLeft } from './countdown.ts';
import { createInitialState } from './create.ts';
import { difficultyProgress, fallSeconds, spawnIntervalSeconds } from './difficulty.ts';
import { hashState } from './hash.ts';
import { toRoundStats } from './round-stats.ts';
import { catWith, makeItem, playingState } from './test-support/states.ts';

test('the combo multiplier rises at 5, 10 and 20 consecutive catches', () => {
  const streaks = [0, 1, 4, 5, 9, 10, 19, 20, 21, 100];
  expect(streaks.map((streak) => comboMultiplier(streak))).toEqual([1, 1, 1, 2, 2, 3, 3, 4, 4, 4]);
});

test('the catch zone is the cat minus 3 px on each side', () => {
  const cat = catWith({ x: 100 });
  const caughtAt = (x: number): boolean => isCaught(makeItem({ id: 1, x }), cat);
  // Zone 103…121: an 11 px item overlaps it from x 93 to x 120.
  expect([92, 93, 120, 121].map(caughtAt)).toEqual([false, true, true, false]);
});

test('seconds left count down from 60 and reach 0 at the round end', () => {
  const at = (playTicks: number): number => secondsLeft(playingState({ playTicks }));
  expect(secondsLeft(createInitialState({ seed: 1, mode: 'arcade' }))).toBe(60);
  expect([0, 1, 119, 120, 121, 7080, 7081, 7199, 7200].map(at)).toEqual([
    60, 60, 60, 59, 59, 1, 1, 1, 0,
  ]);
});

test('difficulty progress grows linearly over the round and stays at 1', () => {
  const at = (playTicks: number): number => difficultyProgress(playingState({ playTicks }));
  expect([0, 1800, 3600, 7200, 9000].map(at)).toEqual([0, 0.25, 0.5, 1, 1]);
});

test('the spawn interval is (0.8 - 0.36 p) x (0.75 + 0.5 u)', () => {
  expect(spawnIntervalSeconds(0, 0)).toBeCloseTo(0.6, 12);
  expect(spawnIntervalSeconds(0, 1)).toBeCloseTo(1, 12);
  expect(spawnIntervalSeconds(1, 0)).toBeCloseTo(0.33, 12);
  expect(spawnIntervalSeconds(1, 1)).toBeCloseTo(0.55, 12);
  expect(spawnIntervalSeconds(0.5, 0.5)).toBe((0.8 - 0.36 * 0.5) * (0.75 + 0.5 * 0.5));
});

test('the fall time is 99 / (24 + 26 p + 10 u), golden bugs 1.35 times faster', () => {
  expect(fallSeconds({ progress: 0, jitter: 0, kind: 'bug' })).toBe(99 / 24);
  expect(fallSeconds({ progress: 1, jitter: 1, kind: 'bug' })).toBe(99 / 60);
  expect(fallSeconds({ progress: 0, jitter: 0, kind: 'bomb' })).toBe(99 / 24);
  expect(fallSeconds({ progress: 0.5, jitter: 0.25, kind: 'golden' })).toBe(99 / 39.5 / 1.35);
});

test('a new round starts in the countdown with the cat centred and the seeded generator', () => {
  const state = createInitialState({ seed: 42, mode: 'arcade' });
  expect(state).toEqual({
    mode: 'arcade',
    seed: 42,
    contentVersion: CONTENT_VERSION,
    tick: 0,
    phase: 'countdown',
    countdownTicks: 216,
    playTicks: 0,
    score: 0,
    streak: 0,
    multiplier: 1,
    cat: {
      x: 108,
      facing: 1,
      isMoving: false,
      moveSeconds: 0,
      aimX: undefined,
      happySeconds: 0,
      startleSeconds: 0,
    },
    items: [],
    nextItemId: 1,
    spawnSeconds: 0.3,
    rng: seedRng(42),
    stats: {
      bugsCaught: 0,
      goldenCaught: 0,
      bombsCaught: 0,
      misses: 0,
      bombsDodged: 0,
      bestStreak: 0,
    },
  });
});

test('the state hash is the canonical hash and changes with the state', () => {
  const state = playingState();
  expect(hashState(state)).toBe(hashCanonical(state));
  expect(hashState(state)).toMatch(/^[0-9a-f]{8}$/);
  expect(hashState({ ...state, score: 1 })).not.toBe(hashState(state));
});

test('round stats copy the simulation stats and add the playing time', () => {
  const stats = {
    bugsCaught: 4,
    goldenCaught: 2,
    bombsCaught: 1,
    misses: 3,
    bombsDodged: 5,
    bestStreak: 6,
  };
  expect(toRoundStats(playingState({ playTicks: 7200, stats }))).toEqual({
    ...stats,
    durationSeconds: 60,
  });
  expect(toRoundStats(playingState({ playTicks: 180, stats })).durationSeconds).toBe(1.5);
});
