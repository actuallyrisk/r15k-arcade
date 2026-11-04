import { SPRITE_CHAR_SLOTS } from './slots.ts';
import { validateSpriteSheet } from './sprite-validate.ts';
import type { SpriteIssue } from './sprite-validate.ts';

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

/** One frame's characters as slot indices; `isMirrored` reverses every row. */
function compileFrame(rows: readonly string[], isMirrored: boolean): Uint8Array {
  const slots = rows.flatMap((row) => {
    const chars = Array.from(row);
    return (isMirrored ? chars.reverse() : chars).map((char) => SPRITE_CHAR_SLOTS[char] ?? 0);
  });
  return Uint8Array.from(slots);
}

/** Compiles one validated sprite. */
function compileSprite(name: string, source: SpriteSource): CompiledSprite {
  return {
    name,
    width: source.width,
    height: source.height,
    frames: source.frames.map((rows) => compileFrame(rows, false)),
    mirroredFrames: source.frames.map((rows) => compileFrame(rows, true)),
  };
}

/** One line per issue, for the error of an invalid sheet. */
function describeIssues(issues: readonly SpriteIssue[]): string {
  return issues
    .map((issue) => {
      const frame = issue.frame === undefined ? '' : ` frame ${issue.frame}`;
      return `${issue.sheet}/${issue.sprite}${frame}: ${issue.message}`;
    })
    .join('\n');
}

/** Compiles every sprite of a sheet; throws (listing every issue) on an invalid source. */
export function compileSpriteSheet<T extends SpriteSheetSource>(sheet: T): CompiledSheet<T> {
  const issues = validateSpriteSheet(sheet);
  if (issues.length > 0) {
    throw new Error(`invalid sprite sheet '${sheet.id}':\n${describeIssues(issues)}`);
  }
  return Object.fromEntries(
    Object.entries(sheet.sprites).map(([name, source]) => [name, compileSprite(name, source)]),
  ) as CompiledSheet<T>;
}
