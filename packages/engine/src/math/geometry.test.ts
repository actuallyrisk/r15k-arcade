import { expect, test } from 'vitest';
import {
  centerRect,
  expandRect,
  insetRect,
  intersectRects,
  rectBottom,
  rectContains,
  rectRight,
  rectsIntersect,
  translateRect,
  ZERO_INSETS,
} from './geometry.ts';

const RECT = { x: 2, y: 3, width: 10, height: 5 };

test('right and bottom edges are exclusive', () => {
  expect(rectRight(RECT)).toBe(12);
  expect(rectBottom(RECT)).toBe(8);
  expect(ZERO_INSETS).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
});

test('rectContains is half-open', () => {
  expect(rectContains(RECT, { x: 2, y: 3 })).toBe(true);
  expect(rectContains(RECT, { x: 11.9, y: 7.9 })).toBe(true);
  expect(rectContains(RECT, { x: 12, y: 3 })).toBe(false);
  expect(rectContains(RECT, { x: 2, y: 8 })).toBe(false);
  expect(rectContains(RECT, { x: 1.9, y: 4 })).toBe(false);
  expect(rectContains(RECT, { x: 4, y: 2.9 })).toBe(false);
});

test('rectsIntersect needs a shared pixel', () => {
  expect(rectsIntersect(RECT, { x: 11, y: 7, width: 5, height: 5 })).toBe(true);
  expect(rectsIntersect(RECT, { x: 12, y: 3, width: 5, height: 5 })).toBe(false);
  expect(rectsIntersect(RECT, { x: 0, y: 8, width: 20, height: 1 })).toBe(false);
  expect(rectsIntersect(RECT, { x: 5, y: 5, width: 0, height: 0 })).toBe(false);
});

test('intersectRects clamps disjoint results to an empty size', () => {
  expect(intersectRects(RECT, { x: 10, y: 0, width: 10, height: 4 })).toEqual({
    x: 10,
    y: 3,
    width: 2,
    height: 1,
  });
  expect(intersectRects(RECT, { x: 20, y: 20, width: 1, height: 1 })).toEqual({
    x: 20,
    y: 20,
    width: 0,
    height: 0,
  });
});

test('insetRect and expandRect move every edge and never go below zero size', () => {
  expect(insetRect(RECT, { top: 1, right: 2, bottom: 1, left: 3 })).toEqual({
    x: 5,
    y: 4,
    width: 5,
    height: 3,
  });
  expect(insetRect(RECT, { top: 3, right: 6, bottom: 3, left: 6 })).toEqual({
    x: 8,
    y: 6,
    width: 0,
    height: 0,
  });
  expect(expandRect(RECT, 1)).toEqual({ x: 1, y: 2, width: 12, height: 7 });
  expect(expandRect(RECT, -3)).toEqual({ x: 5, y: 6, width: 4, height: 0 });
});

test('centerRect floors the offset', () => {
  expect(centerRect(RECT, { width: 5, height: 2 })).toEqual({ x: 4, y: 4, width: 5, height: 2 });
  expect(centerRect(RECT, { width: 13, height: 5 })).toEqual({ x: 0, y: 3, width: 13, height: 5 });
});

test('translateRect keeps the size', () => {
  expect(translateRect(RECT, { x: -2, y: 4 })).toEqual({ x: 0, y: 7, width: 10, height: 5 });
});
