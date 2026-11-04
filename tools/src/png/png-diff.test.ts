import { expect, test } from 'vitest';
import { diffImages, framebufferToImage } from './png-diff.ts';
import type { RgbaImage } from './png-encode.ts';

/** A 2×1 image from two RGBA pixels. */
const twoPixels = (first: readonly number[], second: readonly number[]): RgbaImage => ({
  width: 2,
  height: 1,
  data: Uint8Array.from([...first, ...second]),
});

test('equal images have no different pixels and a grey diff image', () => {
  const image = twoPixels([0, 0, 0, 255], [255, 255, 255, 255]);
  const diff = diffImages(image, twoPixels([0, 0, 0, 255], [255, 255, 255, 255]));
  expect(diff.differentPixels).toBe(0);
  expect([...diff.diffImage.data]).toEqual([128, 128, 128, 255, 255, 255, 255, 255]);
});

test('a differing pixel is counted and drawn red, also when only alpha differs', () => {
  const actual = twoPixels([10, 20, 30, 255], [1, 2, 3, 0]);
  const diff = diffImages(actual, twoPixels([10, 20, 31, 255], [1, 2, 3, 255]));
  expect(diff.differentPixels).toBe(2);
  expect([...diff.diffImage.data]).toEqual([255, 0, 0, 255, 255, 0, 0, 255]);
});

test('a size mismatch makes every pixel of the larger size different', () => {
  const small = twoPixels([0, 0, 0, 255], [0, 0, 0, 255]);
  const tall: RgbaImage = { width: 1, height: 3, data: new Uint8Array(12) };
  const diff = diffImages(small, tall);
  expect(diff.differentPixels).toBe(6);
  expect(diff.diffImage.width).toBe(2);
  expect(diff.diffImage.height).toBe(3);
  expect(new Set(diff.diffImage.data)).toEqual(new Set([255, 0]));
});

test('framebufferToImage maps every slot through the LUT as R, G, B, A bytes', () => {
  const lut = new Uint32Array(256);
  lut[1] = 0xff332211;
  lut[2] = 0x80ccbbaa;
  const framebuffer = { width: 3, height: 1, pixels: Uint8Array.of(1, 2, 1) };
  const image = framebufferToImage(framebuffer, lut);
  expect(image.width).toBe(3);
  expect(image.height).toBe(1);
  expect([...image.data]).toEqual([
    0x11, 0x22, 0x33, 0xff, 0xaa, 0xbb, 0xcc, 0x80, 0x11, 0x22, 0x33, 0xff,
  ]);
});
