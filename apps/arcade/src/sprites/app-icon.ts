import { defineSpriteSheet } from '@r15k/engine';

/**
 * The app icon (32 × 32): a pixel cat head on R15K blue, a placeholder until the icon design brief
 * settles the final motif.
 */
const CAT_HEAD = [
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'bbbbbobbbbbbbbbbbbbbbbbbbbobbbbb',
  'bbbbboobbbbbbbbbbbbbbbbbboobbbbb',
  'bbbbbowobbbbbbbbbbbbbbbbowobbbbb',
  'bbbbbopwobbbbbbbbbbbbbbowpobbbbb',
  'bbbbboppwobbbbbbbbbbbbowppobbbbb',
  'bbbbbopppwobbbbbbbbbbowpppobbbbb',
  'bbbbbopppwwoooooooooowwpppobbbbb',
  'bbbbbowwwwwwwwwwwwwwwwwwwwobbbbb',
  'bbbbowwwwwwwwwwwwwwwwwwwwwwobbbb',
  'bbbbowwwwwwwwwwwwwwwwwwwwwwobbbb',
  'bbbowwwwwwwwwwwwwwwwwwwwwwwwobbb',
  'bbbowwwwoowwwwwwwwwwwwoowwwwobbb',
  'bbbowwwwoowwwwwwwwwwwwoowwwwobbb',
  'bbbowwwwoowwwwwwwwwwwwoowwwwobbb',
  'bbbowwwwwwwwwwwwwwwwwwwwwwwwobbb',
  'bbbowwwwwwwwwwwppwwwwwwwwwwwobbb',
  'oooowwwwwwwwwwwoowwwwwwwwwwwoooo',
  'bbbowwwwwwwwwwowwowwwwwwwwwwobbb',
  'oooowwwwwwwwwwwwwwwwwwwwwwwwoooo',
  'bbbowwwwwwwwwwwwwwwwwwwwwwwwobbb',
  'bbbbowwwwwwwwwwwwwwwwwwwwwwobbbb',
  'bbbbbowwwwwwwwwwwwwwwwwwwwobbbbb',
  'bbbbbbooowwwwwwwwwwwwwwooobbbbbb',
  'bbbbbbbbboooooooooooooobbbbbbbbb',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
] as const;

/** The app icon source (rendered to every platform icon in CI). */
export const APP_ICON_SPRITE_SHEET = defineSpriteSheet({
  id: 'arcade-app-icon',
  sprites: {
    'app-icon': { width: 32, height: 32, frames: [CAT_HEAD] },
  },
});
