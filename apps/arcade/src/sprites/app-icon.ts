import { defineSpriteSheet } from '@r15k/engine';

/** Shape-valid placeholder of the app icon (32×32) until its motif is designed. */
const PLACEHOLDER = [
  'oooooooooooooooooooooooooooooooo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'oooooooooooooooooooooooooooooooo',
] as const;

/** The app icon source (rendered to every platform icon in CI). */
export const APP_ICON_SPRITE_SHEET = defineSpriteSheet({
  id: 'arcade-app-icon',
  sprites: {
    'app-icon': { width: 32, height: 32, frames: [PLACEHOLDER] },
  },
});
