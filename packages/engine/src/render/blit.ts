import type { DrawTarget } from './draw-target.ts';
import { clipBounds } from './raster.ts';
import type { SlotRemap } from './remap.ts';
import { SLOT } from './slots.ts';
import type { CompiledSprite } from './sprite.ts';

/** Where and how a sprite is drawn. */
export interface SpritePlacement {
  readonly x: number;
  readonly y: number;
  /** Default 0; wraps modulo the frame count. */
  readonly frame?: number;
  readonly isMirrored?: boolean;
  readonly remap?: SlotRemap;
}

/** The frame data a placement selects (frame index floored and wrapped, negative included). */
function selectFrame(sprite: CompiledSprite, placement: SpritePlacement): Uint8Array | undefined {
  const frames = placement.isMirrored === true ? sprite.mirroredFrames : sprite.frames;
  const count = frames.length;
  const index = Math.floor(placement.frame ?? 0);
  return frames[((index % count) + count) % count];
}

/**
 * Draws a sprite frame with its top-left corner at (x, y) (floored); transparent pixels are skipped,
 * the target clip applies, and `remap` replaces slots (a slot remapped to transparent is skipped too;
 * a remap shorter than 256 keeps the slots it does not cover).
 */
export function blitSprite(
  target: DrawTarget,
  sprite: CompiledSprite,
  placement: SpritePlacement,
): void {
  const data = selectFrame(sprite, placement);
  if (data === undefined) {
    return;
  }
  const left = Math.floor(target.origin.x + placement.x);
  const top = Math.floor(target.origin.y + placement.y);
  const bounds = clipBounds(target);
  const firstColumn = Math.max(0, bounds.left - left);
  const lastColumn = Math.min(sprite.width, bounds.right - left);
  const firstRow = Math.max(0, bounds.top - top);
  const lastRow = Math.min(sprite.height, bounds.bottom - top);
  const { pixels, width } = target.framebuffer;
  const remap = placement.remap;
  for (let row = firstRow; row < lastRow; row += 1) {
    const rowStart = row * sprite.width;
    const destination = (top + row) * width + left;
    data.subarray(rowStart + firstColumn, rowStart + lastColumn).forEach((source, offset) => {
      const slot = remap === undefined ? source : (remap[source] ?? source);
      if (slot !== SLOT.transparent) {
        pixels[destination + firstColumn + offset] = slot;
      }
    });
  }
}
