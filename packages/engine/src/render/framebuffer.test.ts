import { expect, test } from 'vitest';
import { createDrawTarget, subTarget } from './draw-target.ts';
import { clearFramebuffer, createFramebuffer } from './framebuffer.ts';
import { writeRgba } from './rgba.ts';
import { SLOT } from './slots.ts';

test('a new framebuffer is paper', () => {
  const framebuffer = createFramebuffer({ width: 3, height: 2 });
  expect(framebuffer.width).toBe(3);
  expect(framebuffer.height).toBe(2);
  expect(Array.from(framebuffer.pixels)).toEqual([1, 1, 1, 1, 1, 1]);
  expect(createFramebuffer({ width: 0, height: 4 }).pixels).toHaveLength(0);
});

test('framebuffer sizes must be integers ≥ 0', () => {
  for (const size of [
    { width: -1, height: 2 },
    { width: 2, height: 1.5 },
    { width: Number.NaN, height: 1 },
  ]) {
    expect(() => createFramebuffer(size)).toThrow(RangeError);
  }
});

test('clear fills every pixel, except with transparent', () => {
  const framebuffer = createFramebuffer({ width: 2, height: 2 });
  clearFramebuffer(framebuffer, SLOT.ink);
  expect(Array.from(framebuffer.pixels)).toEqual([2, 2, 2, 2]);
  clearFramebuffer(framebuffer, SLOT.transparent);
  expect(Array.from(framebuffer.pixels)).toEqual([2, 2, 2, 2]);
});

test('sub-targets translate the origin and intersect the clip', () => {
  const root = createDrawTarget(createFramebuffer({ width: 20, height: 10 }));
  expect(root.origin).toEqual({ x: 0, y: 0 });
  expect(root.clip).toEqual({ x: 0, y: 0, width: 20, height: 10 });
  const panel = subTarget(root, { x: 4, y: 2, width: 10, height: 20 });
  expect(panel.origin).toEqual({ x: 4, y: 2 });
  expect(panel.clip).toEqual({ x: 4, y: 2, width: 10, height: 8 });
  const inner = subTarget(panel, { x: -2.5, y: 1.7, width: 5.9, height: -3 });
  expect(inner.origin).toEqual({ x: 1, y: 3 });
  expect(inner.clip).toEqual({ x: 4, y: 3, width: 2, height: 0 });
  expect(inner.framebuffer).toBe(root.framebuffer);
});

test('writeRgba maps every slot through the LUT', () => {
  const framebuffer = createFramebuffer({ width: 2, height: 2 });
  framebuffer.pixels.set([0, 1, 2, 17]);
  const lut = Uint32Array.from({ length: 256 }, (_, slot) => 0xff000000 + slot);
  const out = new Uint32Array(4);
  writeRgba(framebuffer, lut, out);
  expect(Array.from(out)).toEqual([0xff000000, 0xff000001, 0xff000002, 0xff000011]);
});

test('writeRgba turns slots beyond a short LUT into 0 and needs room for every pixel', () => {
  const framebuffer = createFramebuffer({ width: 3, height: 1 });
  framebuffer.pixels.set([1, 2, 5]);
  const out = new Uint32Array(3);
  writeRgba(framebuffer, Uint32Array.from([7, 8, 9]), out);
  expect(Array.from(out)).toEqual([8, 9, 0]);
  expect(() => {
    writeRgba(framebuffer, new Uint32Array(256), new Uint32Array(2));
  }).toThrow(RangeError);
});
