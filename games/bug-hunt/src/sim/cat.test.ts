import { expect, test } from 'vitest';
import { normalizeAimX, updateCat } from './cat.ts';
import { NO_INPUT } from './input.ts';
import { catWith, DT } from './test-support/states.ts';

const KEYBOARD_STEP = 225 * DT;
const POINTER_STEP = 720 * DT;

test('keyboard moves run at 225 px/s, face the move and clear a pointer aim', () => {
  const left = updateCat(catWith({ x: 100, aimX: 50 }), { move: -1, aimX: undefined }, DT);
  expect(left).toMatchObject({ x: 100 - KEYBOARD_STEP, facing: -1, isMoving: true });
  expect(left.aimX).toBeUndefined();
  expect(left.moveSeconds).toBe(DT);
  const right = updateCat(catWith({ x: 100, facing: -1 }), { move: 1, aimX: undefined }, DT);
  expect(right).toMatchObject({ x: 100 + KEYBOARD_STEP, facing: 1, isMoving: true });
});

test('keyboard moves stop at the field edges but still count as running', () => {
  const atLeft = updateCat(catWith({ x: 1 }), { move: -1, aimX: undefined }, DT);
  expect(atLeft).toMatchObject({ x: 0, facing: -1, isMoving: true });
  const atRight = updateCat(catWith({ x: 216 }), { move: 1, aimX: undefined }, DT);
  expect(atRight).toMatchObject({ x: 216, facing: 1, isMoving: true });
});

test('a keyboard move in the same step as a new aim wins over the aim', () => {
  const cat = updateCat(catWith({ x: 100 }), { move: 1, aimX: 10 }, DT);
  expect(cat).toMatchObject({ x: 100 + KEYBOARD_STEP, aimX: undefined, facing: 1 });
});

test('the cat follows a pointer aim at 720 px/s and snaps onto it on arrival', () => {
  let cat = updateCat(catWith({ x: 100 }), { move: 0, aimX: 120 }, DT);
  expect(cat).toMatchObject({ x: 100 + POINTER_STEP, aimX: 120, facing: 1, isMoving: true });
  cat = updateCat(cat, NO_INPUT, DT);
  cat = updateCat(cat, NO_INPUT, DT);
  expect(cat).toMatchObject({ x: 100 + 3 * POINTER_STEP, aimX: 120, isMoving: true });
  cat = updateCat(cat, NO_INPUT, DT);
  expect(cat).toMatchObject({ x: 120, aimX: undefined, facing: 1, isMoving: false });
  expect(cat.moveSeconds).toBeCloseTo(3 * DT, 12);
});

test('following to the left faces left, also when the aim is reached at once', () => {
  const far = updateCat(catWith({ x: 100 }), { move: 0, aimX: 0 }, DT);
  expect(far).toMatchObject({ x: 100 - POINTER_STEP, facing: -1, isMoving: true });
  const near = updateCat(catWith({ x: 100 }), { move: 0, aimX: 97 }, DT);
  expect(near).toMatchObject({ x: 97, facing: -1, isMoving: false, aimX: undefined });
});

test('an aim on the current position keeps the facing and ends the aim', () => {
  const cat = updateCat(catWith({ x: 100, facing: -1 }), { move: 0, aimX: 100 }, DT);
  expect(cat).toMatchObject({ x: 100, facing: -1, isMoving: false, aimX: undefined });
  expect(cat.moveSeconds).toBe(0);
});

test('without input the cat stands still and keeps its facing', () => {
  const cat = updateCat(
    catWith({ x: 50, facing: -1, isMoving: true, moveSeconds: 2 }),
    NO_INPUT,
    DT,
  );
  expect(cat).toMatchObject({ x: 50, facing: -1, isMoving: false, moveSeconds: 2 });
});

test('aims are rounded and clamped to the cat range', () => {
  expect([-5, 0, 10.4, 10.5, 216, 300].map(normalizeAimX)).toEqual([0, 0, 10, 11, 216, 216]);
  const cat = updateCat(catWith({ x: 210 }), { move: 0, aimX: 999 }, DT);
  expect(cat).toMatchObject({ x: 216, aimX: undefined });
});

test('reaction timers run down by one step and stop at zero', () => {
  const cat = updateCat(catWith({ happySeconds: 0.25, startleSeconds: DT / 2 }), NO_INPUT, DT);
  expect(cat.happySeconds).toBe(0.25 - DT);
  expect(cat.startleSeconds).toBe(0);
});
