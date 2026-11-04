// R15K Arcade tools – pixel comparison of snapshot images and framebuffer conversion.
import { notImplemented } from '@r15k/engine';
import type { Framebuffer } from '@r15k/engine';
import type { RgbaImage } from './png-encode.ts';

/** Result of comparing two images: different pixels red, equal pixels grey. */
export interface ImageDiff {
  readonly differentPixels: number;
  readonly diffImage: RgbaImage;
}

/** Compares two images; a size mismatch counts every pixel as different. */
export function diffImages(_actual: RgbaImage, _expected: RgbaImage): ImageDiff {
  return notImplemented('tools.diffImages');
}

/** Converts an indexed framebuffer to RGBA through a palette LUT. */
export function framebufferToImage(_framebuffer: Framebuffer, _lut: Uint32Array): RgbaImage {
  return notImplemented('tools.framebufferToImage');
}
