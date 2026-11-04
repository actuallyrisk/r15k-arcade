import type { Point, Rect } from '../math/geometry.ts';
import { notImplemented } from '../util/assert.ts';
import type { Framebuffer } from './framebuffer.ts';

/** All drawing goes through a target: an origin translation plus a clip rectangle. */
export interface DrawTarget {
  readonly framebuffer: Framebuffer;
  readonly origin: Point;
  readonly clip: Rect;
}

/** A target covering the whole framebuffer. */
export function createDrawTarget(_framebuffer: Framebuffer): DrawTarget {
  return notImplemented('engine.createDrawTarget');
}

/** A target for `rect` (in target coordinates); its clip is the intersection with the parent clip. */
export function subTarget(_target: DrawTarget, _rect: Rect): DrawTarget {
  return notImplemented('engine.subTarget');
}
