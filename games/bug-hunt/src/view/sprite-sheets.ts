import { compileSpriteSheet } from '@r15k/engine';
import type { CompiledSheet } from '@r15k/engine';
import { CAT_SPRITE_SHEET } from '../sprites/cat.ts';
import { ITEM_SPRITE_SHEET } from '../sprites/items.ts';

/** The compiled sprites of Bug Hunt; keys are literal, so lookups are never undefined. */
export interface BugHuntSprites {
  readonly cat: CompiledSheet<typeof CAT_SPRITE_SHEET>;
  readonly items: CompiledSheet<typeof ITEM_SPRITE_SHEET>;
}

let cached: BugHuntSprites | undefined;

/** Both sheets, compiled on the first call and cached. */
export function getBugHuntSprites(): BugHuntSprites {
  cached ??= {
    cat: compileSpriteSheet(CAT_SPRITE_SHEET),
    items: compileSpriteSheet(ITEM_SPRITE_SHEET),
  };
  return cached;
}
