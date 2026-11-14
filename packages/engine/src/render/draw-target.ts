import { intersectRects } from '../math/geometry.ts';
import type { Point, Rect } from '../math/geometry.ts';
import type { Framebuffer } from './framebuffer.ts';

/**
 * All drawing goes through a target: an origin translation plus a clip rectangle. `origin` and `clip`
 * are in framebuffer pixels; drawing coordinates are relative to `origin`.
 */
export interface DrawTarget {
  readonly framebuffer: Framebuffer;
  readonly origin: Point;
  readonly clip: Rect;
}

/** A target covering the whole framebuffer. */
export function createDrawTarget(framebuffer: Framebuffer): DrawTarget {
  return {
    framebuffer,
    origin: { x: 0, y: 0 },
    clip: { x: 0, y: 0, width: framebuffer.width, height: framebuffer.height },
  };
}

/**
 * A target for `rect` (in target coordinates, floored like every drawing coordinate); its clip is the
 * intersection with the parent clip, so a sub-target never draws outside its parent.
 */
export function subTarget(target: DrawTarget, rect: Rect): DrawTarget {
  const x = Math.floor(target.origin.x + rect.x);
  const y = Math.floor(target.origin.y + rect.y);
  const bounds = {
    x,
    y,
    width: Math.max(0, Math.floor(rect.width)),
    height: Math.max(0, Math.floor(rect.height)),
  };
  return {
    framebuffer: target.framebuffer,
    origin: { x, y },
    clip: intersectRects(bounds, target.clip),
  };
}
