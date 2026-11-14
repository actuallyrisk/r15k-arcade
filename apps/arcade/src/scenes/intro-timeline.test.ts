import { expect, test } from 'vitest';
import { INTRO_TIMING } from '../content/intro-timing.ts';
import { introDuration, introStage, stageKey } from './intro-timeline.ts';

test('full ≈ 9.3 s and short ≈ 2.1 s', () => {
  expect(introDuration(INTRO_TIMING.full)).toBeCloseTo(9.3, 6);
  expect(introDuration(INTRO_TIMING.short)).toBeCloseTo(2.1, 6);
});

test('GAME OVER, then CONTINUE? 9 … 0, then INSERT COIN, then done', () => {
  const full = INTRO_TIMING.full;
  expect(introStage(full, 1.0)).toEqual({ kind: 'game-over' });
  expect(introStage(full, 1.6)).toEqual({ kind: 'continue', digit: 9 });
  expect(introStage(full, 4.0)).toEqual({ kind: 'continue', digit: 5 });
  expect(introStage(full, 7.4)).toEqual({ kind: 'continue', digit: 0 });
  expect(introStage(full, 8.0)).toMatchObject({ kind: 'insert-coin' });
  expect(introStage(full, 9.4)).toEqual({ kind: 'done' });
  expect(introStage(INTRO_TIMING.short, 0.9)).toEqual({ kind: 'continue', digit: 2 });
});

test('the stage key changes per digit', () => {
  const three = stageKey({ kind: 'continue', digit: 3 });
  expect(three).not.toBe(stageKey({ kind: 'continue', digit: 2 }));
  expect(stageKey({ kind: 'game-over' })).toBe('game-over');
});
