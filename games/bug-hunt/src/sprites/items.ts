// R15K Bug Hunt – the falling items (assets licence). Characters: o ink, w paper, p pink, b blue, g gold,
// . transparent. The golden bug wears a crown, so it differs from the bug by shape, not only by colour.
import { defineSpriteSheet } from '@r15k/engine';

/** Bug, frame 1: antennae spread, legs out. */
const BUG_A = [
  '.o.......o.',
  '..o.....o..',
  '...ooooo...',
  '..ooooooo..',
  'o.obbobbo.o',
  '.oobwobboo.',
  '..obbobbo..',
  'ooobbobbooo',
  '..obbobbo..',
  '.oobbobboo.',
  'o..ooooo..o',
] as const;

/** Bug, frame 2: antennae up, legs shifted (wiggle). */
const BUG_B = [
  '..o.....o..',
  '..o.....o..',
  '...ooooo...',
  'o.ooooooo.o',
  '.oobbobboo.',
  '..obwobbo..',
  'ooobbobbooo',
  '..obbobbo..',
  '.oobbobboo.',
  'o.obbobbo.o',
  '...ooooo...',
] as const;

/** Golden bug, frame 1: three-point crown, sparkle on the left wing. */
const GOLDEN_A = [
  '.o...o...o.',
  '.oo.ooo.oo.',
  '.ogogggogo.',
  '.ooooooooo.',
  'o.oggoggo.o',
  '.oogwoggoo.',
  '..oggoggo..',
  'oooggoggooo',
  '..oggoggo..',
  '.ooggoggoo.',
  'o..ooooo..o',
] as const;

/** Golden bug, frame 2: legs shifted, sparkle on the right wing. */
const GOLDEN_B = [
  '.o...o...o.',
  '.oo.ooo.oo.',
  '.ogogggogo.',
  '.ooooooooo.',
  '.ooggoggoo.',
  '..oggowgo..',
  'oooggoggooo',
  '..oggoggo..',
  '.ooggoggoo.',
  'o.oggoggo.o',
  '...ooooo...',
] as const;

/** Friday-deploy bomb, frame 1: pink fuse spark. */
const BOMB_A = [
  '........p..',
  '.......o.p.',
  '......o....',
  '....ooo....',
  '..ooooooo..',
  '.ooooooooo.',
  '.owwoooooo.',
  '.owooooooo.',
  '.ooooooooo.',
  '.ooooooooo.',
  '..ooooooo..',
  '....ooo....',
] as const;

/** Friday-deploy bomb, frame 2: blue fuse spark. */
const BOMB_B = [
  '.......b.b.',
  '.......ob..',
  '......o....',
  '....ooo....',
  '..ooooooo..',
  '.ooooooooo.',
  '.owwoooooo.',
  '.owooooooo.',
  '.ooooooooo.',
  '.ooooooooo.',
  '..ooooooo..',
  '....ooo....',
] as const;

/** The falling items: bug, golden bug and bomb, two frames each. */
export const ITEM_SPRITE_SHEET = defineSpriteSheet({
  id: 'bug-hunt-items',
  sprites: {
    bug: { width: 11, height: 11, frames: [BUG_A, BUG_B] },
    'golden-bug': { width: 11, height: 11, frames: [GOLDEN_A, GOLDEN_B] },
    bomb: { width: 11, height: 12, frames: [BOMB_A, BOMB_B] },
  },
});
