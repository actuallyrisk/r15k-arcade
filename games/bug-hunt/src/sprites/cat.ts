import { defineSpriteSheet } from '@r15k/engine';

/** Shape-valid placeholder frame (24×24) until the cat is drawn. */
const PLACEHOLDER = [
  'oooooooooooooooooooooooo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'owwwwwwwwwwwwwwwwwwwwwwo',
  'oooooooooooooooooooooooo',
  '........................',
] as const;

/** The cat: sit, run (4 frames), happy and startle; all frames face right. */
export const CAT_SPRITE_SHEET = defineSpriteSheet({
  id: 'bug-hunt-cat',
  sprites: {
    'cat-sit': { width: 24, height: 24, frames: [PLACEHOLDER] },
    'cat-run': {
      width: 24,
      height: 24,
      frames: [PLACEHOLDER, PLACEHOLDER, PLACEHOLDER, PLACEHOLDER],
    },
    'cat-happy': { width: 24, height: 24, frames: [PLACEHOLDER] },
    'cat-startle': { width: 24, height: 24, frames: [PLACEHOLDER] },
  },
});
