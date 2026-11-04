import { defineSpriteSheet } from '@r15k/engine';

/** Shape-valid placeholder frame of the bug (11×11). */
const BUG_PLACEHOLDER = [
  'ooooooooooo',
  'obbbbbbbbbo',
  'obbbbbbbbbo',
  'obbbbbbbbbo',
  'obbbbbbbbbo',
  'obbbbbbbbbo',
  'obbbbbbbbbo',
  'obbbbbbbbbo',
  'obbbbbbbbbo',
  'obbbbbbbbbo',
  'ooooooooooo',
] as const;

/** Shape-valid placeholder frame of the golden bug (11×11). */
const GOLDEN_PLACEHOLDER = [
  'ooooooooooo',
  'ogggggggggo',
  'ogggggggggo',
  'ogggggggggo',
  'ogggggggggo',
  'ogggggggggo',
  'ogggggggggo',
  'ogggggggggo',
  'ogggggggggo',
  'ogggggggggo',
  'ooooooooooo',
] as const;

/** Shape-valid placeholder frame of the bomb (11×12). */
const BOMB_PLACEHOLDER = [
  '.....p.....',
  'ooooooooooo',
  'ooooooooooo',
  'ooooooooooo',
  'ooooooooooo',
  'ooooooooooo',
  'ooooooooooo',
  'ooooooooooo',
  'ooooooooooo',
  'ooooooooooo',
  'ooooooooooo',
  'ooooooooooo',
] as const;

/** The falling items: bug, golden bug and bomb, two frames each. */
export const ITEM_SPRITE_SHEET = defineSpriteSheet({
  id: 'bug-hunt-items',
  sprites: {
    bug: { width: 11, height: 11, frames: [BUG_PLACEHOLDER, BUG_PLACEHOLDER] },
    'golden-bug': { width: 11, height: 11, frames: [GOLDEN_PLACEHOLDER, GOLDEN_PLACEHOLDER] },
    bomb: { width: 11, height: 12, frames: [BOMB_PLACEHOLDER, BOMB_PLACEHOLDER] },
  },
});
