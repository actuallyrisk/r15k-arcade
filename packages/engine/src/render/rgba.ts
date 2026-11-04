import { notImplemented } from '../util/assert.ts';
import type { Framebuffer } from './framebuffer.ts';

/** Converts slot indices to RGBA through the LUT: `out[i] = lut[pixels[i]]`. */
export function writeRgba(_framebuffer: Framebuffer, _lut: Uint32Array, _out: Uint32Array): void {
  return notImplemented('engine.writeRgba');
}
