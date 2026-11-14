// Private to render/: clipping and span filling in framebuffer pixels, shared by the primitives, the
// sprite blitter and the text renderer. Slot 0 (transparent) is never written.
import type { Rect } from '../math/geometry.ts';
import type { DrawTarget } from './draw-target.ts';
import { SLOT } from './slots.ts';
import type { SlotIndex } from './slots.ts';

/** Writable area of a target in framebuffer pixels: `[left, right) × [top, bottom)`. */
export interface PixelBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** The target's clip intersected with its framebuffer (a hand-built clip never escapes the buffer). */
export function clipBounds(target: DrawTarget): PixelBounds {
  const { clip, framebuffer } = target;
  return {
    left: Math.max(0, Math.floor(clip.x)),
    top: Math.max(0, Math.floor(clip.y)),
    right: Math.min(framebuffer.width, Math.floor(clip.x + clip.width)),
    bottom: Math.min(framebuffer.height, Math.floor(clip.y + clip.height)),
  };
}

/** A rectangle in target coordinates moved to framebuffer pixels, every number floored. */
export function toPixelRect(target: DrawTarget, rect: Rect): Rect {
  return {
    x: Math.floor(target.origin.x + rect.x),
    y: Math.floor(target.origin.y + rect.y),
    width: Math.floor(rect.width),
    height: Math.floor(rect.height),
  };
}

/** Fills a rectangle given in framebuffer pixels, clipped. */
export function fillPixelRect(target: DrawTarget, rect: Rect, slot: SlotIndex): void {
  if (slot === SLOT.transparent) {
    return;
  }
  const bounds = clipBounds(target);
  const left = Math.max(rect.x, bounds.left);
  const right = Math.min(rect.x + rect.width, bounds.right);
  const top = Math.max(rect.y, bounds.top);
  const bottom = Math.min(rect.y + rect.height, bounds.bottom);
  if (left >= right) {
    return;
  }
  const { pixels, width } = target.framebuffer;
  for (let y = top; y < bottom; y += 1) {
    pixels.fill(slot, y * width + left, y * width + right);
  }
}
