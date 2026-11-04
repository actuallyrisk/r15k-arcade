import type { Size } from '../math/geometry.ts';
import { notImplemented } from '../util/assert.ts';
import type { SlotIndex } from './slots.ts';

/** Indexed-colour framebuffer at logical resolution: one palette slot per pixel, row-major. */
export interface Framebuffer {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

/** Creates a framebuffer filled with SLOT.paper. */
export function createFramebuffer(_size: Size): Framebuffer {
  return notImplemented('engine.createFramebuffer');
}

/** Fills the whole framebuffer with one slot. */
export function clearFramebuffer(_framebuffer: Framebuffer, _slot: SlotIndex): void {
  return notImplemented('engine.clearFramebuffer');
}
