import { expect, test } from 'vitest';
import { subTarget } from './draw-target.ts';
import { drawHLine, drawVLine, fillDither, fillRect, setPixel, strokeRect } from './primitives.ts';
import { SLOT } from './slots.ts';
import { paperTarget, pixelRows } from './test-support/pixels.ts';

test('setPixel floors coordinates and ignores pixels outside', () => {
  const target = paperTarget(3, 2);
  setPixel(target, { x: 1.9, y: 0.2 }, SLOT.ink);
  setPixel(target, { x: -1, y: 0 }, SLOT.ink);
  setPixel(target, { x: 3, y: 1 }, SLOT.ink);
  setPixel(target, { x: 0, y: 2 }, SLOT.ink);
  setPixel(target, { x: 2, y: 1 }, SLOT.transparent);
  expect(pixelRows(target)).toEqual(['.#.', '...']);
});

test('fillRect clips to the framebuffer and to sub-targets', () => {
  const target = paperTarget(6, 4);
  fillRect(target, { x: -2, y: -1, width: 4, height: 2 }, SLOT.ink);
  const panel = subTarget(target, { x: 3, y: 1, width: 2, height: 2 });
  fillRect(panel, { x: -1, y: 0, width: 10, height: 10 }, SLOT.blue);
  fillRect(target, { x: 0, y: 3, width: 0, height: 1 }, SLOT.ink);
  fillRect(target, { x: 5, y: 3, width: 1.9, height: 1.9 }, SLOT.gold);
  expect(pixelRows(target)).toEqual(['##....', '...33.', '...33.', '.....9']);
});

test('a hand-built clip larger than the framebuffer never wraps into the next row', () => {
  const base = paperTarget(3, 2);
  const target = { ...base, clip: { x: -5, y: -5, width: 50, height: 50 } };
  fillRect(target, { x: 1, y: 0, width: 5, height: 1 }, SLOT.ink);
  expect(pixelRows(target)).toEqual(['.##', '...']);
});

test('strokeRect draws a 1 px outline inside the rectangle', () => {
  const target = paperTarget(7, 5);
  strokeRect(target, { x: 0, y: 0, width: 4, height: 4 }, SLOT.ink);
  strokeRect(target, { x: 5, y: 0, width: 1, height: 1 }, SLOT.blue);
  strokeRect(target, { x: 5, y: 2, width: 2, height: 2 }, SLOT.gold);
  strokeRect(target, { x: 0, y: 4, width: 0, height: 3 }, SLOT.ink);
  expect(pixelRows(target)).toEqual(['####.3.', '#..#...', '#..#.99', '####.99', '.......']);
});

test('lines run right and down for their length', () => {
  const target = paperTarget(4, 4);
  drawHLine(target, { x: 1, y: 0, length: 3, slot: SLOT.ink });
  drawVLine(target, { x: 0, y: 1, length: 2, slot: SLOT.blue });
  drawHLine(target, { x: 0, y: 3, length: 0, slot: SLOT.ink });
  drawVLine(target, { x: 3, y: 3, length: -2, slot: SLOT.ink });
  expect(pixelRows(target)).toEqual(['.###', '3...', '3...', '....']);
});

test('fillDither shifts every other dotted row', () => {
  const target = paperTarget(8, 5);
  fillDither(
    target,
    { x: 0, y: 0, width: 8, height: 5 },
    {
      slot: SLOT.ink,
      stepX: 2,
      stepY: 2,
      oddRowShift: 1,
    },
  );
  expect(pixelRows(target)).toEqual(['#.#.#.#.', '........', '.#.#.#.#', '........', '#.#.#.#.']);
});

test('fillDither measures from the rectangle and respects the clip', () => {
  const target = paperTarget(6, 3);
  const panel = subTarget(target, { x: 1, y: 0, width: 4, height: 3 });
  const spec = { slot: SLOT.grid, stepX: 3, stepY: 1, oddRowShift: 2 };
  fillDither(panel, { x: 1, y: 0, width: 10, height: 3 }, spec);
  fillDither(panel, { x: 0, y: 0, width: 4, height: 3 }, { ...spec, slot: SLOT.transparent });
  expect(pixelRows(target)).toEqual(['..e...', '....e.', '..e...']);
});

test('fillDither rejects steps below 1', () => {
  const target = paperTarget(2, 2);
  const rect = { x: 0, y: 0, width: 2, height: 2 };
  for (const steps of [
    { stepX: 0, stepY: 1 },
    { stepX: 1, stepY: 0 },
    { stepX: 1.5, stepY: 1 },
    { stepX: 1, stepY: Number.NaN },
  ]) {
    expect(() => {
      fillDither(target, rect, { slot: SLOT.ink, oddRowShift: 0, ...steps });
    }).toThrow(RangeError);
  }
});
