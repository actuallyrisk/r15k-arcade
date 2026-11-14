import { describe, expect, test } from 'vitest';
import { TUNING } from '../content/tuning.ts';
import { createInitialState } from '../sim/create.ts';
import type { BugHuntState, Item } from '../sim/state.ts';
import {
  catchTweenPosition,
  catScreenX,
  catTopY,
  drawnFall,
  groundLineY,
  itemBottomY,
} from './item-mapping.ts';
import { referenceLayout } from './test-support/round-fixtures.ts';

const LAYOUT = referenceLayout('phone-portrait');
const ITEM: Item = { id: 3, kind: 'bug', x: 50, fall: 0.5, fallSeconds: 2, animSeconds: 0 };

describe('fall → y mapping', () => {
  test('linear from the field top (0) to the ground line (1)', () => {
    expect(groundLineY(LAYOUT)).toBe(53 + 480 - 16);
    expect(itemBottomY(LAYOUT, 0)).toBe(53);
    expect(itemBottomY(LAYOUT, 1)).toBe(517);
    expect(itemBottomY(LAYOUT, 0.5)).toBe(285);
  });

  test('on a tall field the catch starts above the cat (the view tweens it into the paws)', () => {
    const catchBottom = itemBottomY(LAYOUT, TUNING.catchFallStart);
    expect(catTopY(LAYOUT, 0) - catchBottom).toBeCloseTo(0.12 * (480 - 16) - 24);
  });

  test('items present in both states are interpolated with alpha', () => {
    const previous: BugHuntState = {
      ...createInitialState({ seed: 1, mode: 'arcade' }),
      items: [{ ...ITEM, fall: 0.4 }],
    };
    expect(drawnFall(previous, ITEM, 0.25)).toBeCloseTo(0.425);
    expect(drawnFall({ ...previous, items: [] }, ITEM, 0.25)).toBe(0.5);
  });
});

describe('cat and catch tween', () => {
  test('the cat is interpolated and rounded; the hop lifts its top', () => {
    const state = createInitialState({ seed: 1, mode: 'arcade' });
    const moved = { ...state, cat: { ...state.cat, x: 110 } };
    expect(catScreenX(LAYOUT, { previous: state, current: moved }, 0.5)).toBe(24 + 109);
    expect(catTopY(LAYOUT, 2)).toBe(517 - 24 - 2);
  });

  test('a tween starts where the item was drawn and ends in the paws', () => {
    const target = { catX: 124, catTop: 493, spriteHeight: 11 };
    const tween = { itemKind: 'bug' as const, fromX: 60, fromFall: 0.9, ageSeconds: 0 };
    expect(catchTweenPosition(LAYOUT, tween, target)).toEqual({
      x: 84,
      y: Math.round(itemBottomY(LAYOUT, 0.9) - 11),
    });
    const done = { ...tween, ageSeconds: TUNING.view.catchTweenSeconds };
    expect(catchTweenPosition(LAYOUT, done, target)).toEqual({
      x: Math.round(124 + 12 - 5.5),
      y: 493 + 12 - 11,
    });
    const half = catchTweenPosition(
      LAYOUT,
      { ...tween, ageSeconds: TUNING.view.catchTweenSeconds / 2 },
      target,
    );
    expect(half.y).toBeGreaterThan(Math.round(itemBottomY(LAYOUT, 0.9) - 11));
  });
});
