import { notImplemented } from '../util/assert.ts';
import type { SpriteSheetSource } from './sprite.ts';

/** Size and frame limits a sprite must respect. */
export interface SpriteLimits {
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly maxFrames: number;
}

/** Default sprite limits. */
export const DEFAULT_SPRITE_LIMITS: SpriteLimits = { maxWidth: 64, maxHeight: 64, maxFrames: 16 };

/** One problem found in a sprite sheet. */
export interface SpriteIssue {
  readonly sheet: string;
  readonly sprite: string;
  readonly frame: number | undefined;
  readonly message: string;
}

/**
 * Checks a sheet: kebab-case ids and names, sizes and frame counts within the limits, every frame
 * `height` rows of `width` known characters with at least one opaque pixel.
 */
export function validateSpriteSheet(
  _sheet: SpriteSheetSource,
  _limits?: SpriteLimits,
): readonly SpriteIssue[] {
  return notImplemented('engine.validateSpriteSheet');
}
