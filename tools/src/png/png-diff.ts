// R15K Arcade tools – pixel comparison of snapshot images and framebuffer conversion. The diff image shows
// differing pixels in red and equal pixels as a light grey of their brightness, so the scene stays
// recognisable behind the differences. LUT entries are unpacked byte by byte, independent of host byte
// order.
import { writeRgba } from '@r15k/engine';
import type { Framebuffer } from '@r15k/engine';
import type { RgbaImage } from './png-encode.ts';

/** Result of comparing two images: different pixels red, equal pixels grey. */
export interface ImageDiff {
  readonly differentPixels: number;
  readonly diffImage: RgbaImage;
}

const RED = [255, 0, 0, 255] as const;

/** A light grey (128…255) of a pixel's brightness. */
function greyOf(data: Uint8Array, offset: number): number {
  const red = data[offset] ?? 0;
  const green = data[offset + 1] ?? 0;
  const blue = data[offset + 2] ?? 0;
  const luma = (red * 77 + green * 150 + blue * 29) >> 8;
  return 128 + (luma >> 1);
}

/** Whether the four bytes at `offset` are equal in both images. */
function isPixelEqual(actual: Uint8Array, expected: Uint8Array, offset: number): boolean {
  for (let channel = 0; channel < 4; channel += 1) {
    if (actual[offset + channel] !== expected[offset + channel]) {
      return false;
    }
  }
  return true;
}

/** An image of the larger size of both, every pixel red. */
function sizeMismatch(actual: RgbaImage, expected: RgbaImage): ImageDiff {
  const width = Math.max(actual.width, expected.width);
  const height = Math.max(actual.height, expected.height);
  const data = new Uint8Array(width * height * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    data.set(RED, offset);
  }
  return { differentPixels: width * height, diffImage: { width, height, data } };
}

/** Compares two images; a size mismatch counts every pixel as different. */
export function diffImages(actual: RgbaImage, expected: RgbaImage): ImageDiff {
  if (actual.width !== expected.width || actual.height !== expected.height) {
    return sizeMismatch(actual, expected);
  }
  const data = new Uint8Array(actual.data.length);
  let differentPixels = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (isPixelEqual(actual.data, expected.data, offset)) {
      const grey = greyOf(actual.data, offset);
      data.set([grey, grey, grey, 255], offset);
    } else {
      differentPixels += 1;
      data.set(RED, offset);
    }
  }
  return {
    differentPixels,
    diffImage: { width: actual.width, height: actual.height, data },
  };
}

/** Converts an indexed framebuffer to RGBA through a palette LUT. */
export function framebufferToImage(framebuffer: Framebuffer, lut: Uint32Array): RgbaImage {
  const { width, height } = framebuffer;
  const entries = new Uint32Array(width * height);
  writeRgba(framebuffer, lut, entries);
  const data = new Uint8Array(width * height * 4);
  entries.forEach((entry, index) => {
    data[index * 4] = entry & 0xff;
    data[index * 4 + 1] = (entry >>> 8) & 0xff;
    data[index * 4 + 2] = (entry >>> 16) & 0xff;
    data[index * 4 + 3] = entry >>> 24;
  });
  return { width, height, data };
}
