import { notImplemented } from '../util/assert.ts';
import type { DrawTarget } from './draw-target.ts';
import type { SlotRemap } from './remap.ts';
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

/** Draws a sprite frame; transparent pixels are skipped, the target clip applies. */
export function blitSprite(
  _target: DrawTarget,
  _sprite: CompiledSprite,
  _placement: SpritePlacement,
): void {
  return notImplemented('engine.blitSprite');
}
