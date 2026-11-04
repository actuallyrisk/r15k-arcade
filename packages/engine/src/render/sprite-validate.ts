import { SPRITE_CHAR_SLOTS } from './slots.ts';
import type { SpriteSheetSource, SpriteSource } from './sprite.ts';

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
  /** '' for a problem of the sheet itself. */
  readonly sprite: string;
  /** `undefined` for a problem of the whole sprite or sheet. */
  readonly frame: number | undefined;
  readonly message: string;
}

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TRANSPARENT_CHAR = '.';

/** Whether `value` is an integer in `1…max`. */
function isWithin(value: number, max: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= max;
}

/** Sprite-level problems: kebab-case name, size and frame count within the limits. */
function spriteMessages(name: string, sprite: SpriteSource, limits: SpriteLimits): string[] {
  const messages: string[] = [];
  if (!KEBAB_CASE.test(name)) {
    messages.push('sprite name is not kebab-case');
  }
  if (!isWithin(sprite.width, limits.maxWidth) || !isWithin(sprite.height, limits.maxHeight)) {
    messages.push(
      `size ${sprite.width}×${sprite.height} is outside 1…${limits.maxWidth} × 1…${limits.maxHeight}`,
    );
  }
  if (!isWithin(sprite.frames.length, limits.maxFrames)) {
    messages.push(`has ${sprite.frames.length} frames, expected 1…${limits.maxFrames}`);
  }
  return messages;
}

/** Frame-level problems: row count, row widths, unknown characters, at least one opaque pixel. */
function frameMessages(sprite: SpriteSource, rows: readonly string[]): string[] {
  const messages: string[] = [];
  if (rows.length !== sprite.height) {
    messages.push(`has ${rows.length} rows, expected ${sprite.height}`);
  }
  rows.forEach((row, index) => {
    if (row.length !== sprite.width) {
      messages.push(`row ${index} has ${row.length} characters, expected ${sprite.width}`);
    }
  });
  const chars = [...new Set(rows.join(''))];
  const unknown = chars.filter((char) => !Object.hasOwn(SPRITE_CHAR_SLOTS, char));
  if (unknown.length > 0) {
    messages.push(`unknown characters ${unknown.map((char) => `'${char}'`).join(', ')}`);
  }
  if (!chars.some((char) => char !== TRANSPARENT_CHAR && !unknown.includes(char))) {
    messages.push('has no opaque pixel');
  }
  return messages;
}

/** Every problem of one sprite, sprite-level first, then per frame. */
function spriteIssues(
  sheet: string,
  entry: readonly [string, SpriteSource],
  limits: SpriteLimits,
): SpriteIssue[] {
  const [name, sprite] = entry;
  const own = spriteMessages(name, sprite, limits).map((message) => ({
    sheet,
    sprite: name,
    frame: undefined,
    message,
  }));
  const frames = sprite.frames.flatMap((rows, frame) =>
    frameMessages(sprite, rows).map((message) => ({ sheet, sprite: name, frame, message })),
  );
  return [...own, ...frames];
}

/**
 * Checks a sheet: kebab-case ids and names, sizes and frame counts within the limits, every frame
 * `height` rows of `width` known characters with at least one opaque pixel. Returns no issues for a
 * valid sheet.
 */
export function validateSpriteSheet(
  sheet: SpriteSheetSource,
  limits: SpriteLimits = DEFAULT_SPRITE_LIMITS,
): readonly SpriteIssue[] {
  const sheetIssues: SpriteIssue[] = KEBAB_CASE.test(sheet.id)
    ? []
    : [{ sheet: sheet.id, sprite: '', frame: undefined, message: 'sheet id is not kebab-case' }];
  const sprites = Object.entries(sheet.sprites).flatMap((entry) =>
    spriteIssues(sheet.id, entry, limits),
  );
  return [...sheetIssues, ...sprites];
}
