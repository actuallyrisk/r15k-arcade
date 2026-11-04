import type { Size } from '../math/geometry.ts';
import { SLOT } from './slots.ts';
import type { SlotIndex } from './slots.ts';

/** Indexed-colour framebuffer at logical resolution: one palette slot per pixel, row-major. */
export interface Framebuffer {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

/** Creates a framebuffer filled with SLOT.paper; width and height must be integers ≥ 0. */
export function createFramebuffer(size: Size): Framebuffer {
  const { width, height } = size;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 0 || height < 0) {
    throw new RangeError(`framebuffer size must be integers ≥ 0, got ${width}×${height}`);
  }
  return { width, height, pixels: new Uint8Array(width * height).fill(SLOT.paper) };
}

/** Fills the whole framebuffer with one slot (transparent draws nothing: slot 0 is never written). */
export function clearFramebuffer(framebuffer: Framebuffer, slot: SlotIndex): void {
  if (slot !== SLOT.transparent) {
    framebuffer.pixels.fill(slot);
  }
}
