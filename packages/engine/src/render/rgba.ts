import type { Framebuffer } from './framebuffer.ts';

/**
 * Converts slot indices to RGBA through the LUT: `out[i] = lut[pixels[i]]` (a slot beyond a short LUT
 * becomes 0, transparent black). `out` must hold at least one entry per pixel, else it throws.
 */
export function writeRgba(framebuffer: Framebuffer, lut: Uint32Array, out: Uint32Array): void {
  const { pixels } = framebuffer;
  if (out.length < pixels.length) {
    throw new RangeError(`writeRgba: output has ${out.length} entries for ${pixels.length} pixels`);
  }
  pixels.forEach((slot, index) => {
    out[index] = lut[slot] ?? 0;
  });
}
