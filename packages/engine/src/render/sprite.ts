import { notImplemented } from '../util/assert.ts';

/** A sprite as text grids: one character per pixel, `height` rows of `width` characters per frame. */
export interface SpriteSource {
  readonly width: number;
  readonly height: number;
  readonly frames: readonly (readonly string[])[];
}

/** A named set of sprites. */
export interface SpriteSheetSource {
  readonly id: string;
  readonly sprites: Readonly<Record<string, SpriteSource>>;
}

/**
 * Returns the sheet unchanged. It exists for typing: the literal sprite names are kept, while the
 * shape is checked against SpriteSheetSource.
 */
export function defineSpriteSheet<const T extends SpriteSheetSource>(sheet: T): T {
  return sheet;
}

/** A sprite compiled to slot indices, with horizontally mirrored frames precomputed. */
export interface CompiledSprite {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** `width × height` slot indices per frame, row-major. */
  readonly frames: readonly Uint8Array[];
  /** Horizontally flipped frames. */
  readonly mirroredFrames: readonly Uint8Array[];
}

/** Compiled sprites of a sheet, keyed by the sheet's literal sprite names. */
export type CompiledSheet<T extends SpriteSheetSource> = {
  readonly [K in keyof T['sprites']]: CompiledSprite;
};

/** Compiles every sprite of a sheet; throws on an invalid source. */
export function compileSpriteSheet<T extends SpriteSheetSource>(_sheet: T): CompiledSheet<T> {
  return notImplemented('engine.compileSpriteSheet');
}
