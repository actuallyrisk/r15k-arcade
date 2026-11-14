/** Palette slots of the 16 design tokens; slot 0 is transparent in sprites and never written to the framebuffer. */
export const SLOT = {
  transparent: 0,
  paper: 1,
  ink: 2,
  blue: 3,
  blueInk: 4,
  blueTint: 5,
  pink: 6,
  pinkInk: 7,
  green: 8,
  gold: 9,
  grey: 10,
  greyStrong: 11,
  greyLight: 12,
  greyFaint: 13,
  grid: 14,
  shadow: 15,
} as const;

/** Role slots whose token differs per palette for contrast reasons; never used in sprites. */
export const ROLE_SLOT = { warning: 16, popupShadow: 17 } as const;

/** Name of a token slot (every slot except transparent). */
export type SlotName = Exclude<keyof typeof SLOT, 'transparent'>;

/** Name of a role slot. */
export type RoleSlotName = keyof typeof ROLE_SLOT;

/** Every colour a palette defines: token slots and role slots. */
export type ColorName = SlotName | RoleSlotName;

/** Index of a token or role slot as stored in the framebuffer. */
export type SlotIndex = (typeof SLOT)[keyof typeof SLOT] | (typeof ROLE_SLOT)[RoleSlotName];

/** Token slot names in index order 1…15. */
export const SLOT_NAMES: readonly SlotName[] = [
  'paper',
  'ink',
  'blue',
  'blueInk',
  'blueTint',
  'pink',
  'pinkInk',
  'green',
  'gold',
  'grey',
  'greyStrong',
  'greyLight',
  'greyFaint',
  'grid',
  'shadow',
];

/** Role slot names in index order 16…17. */
export const ROLE_SLOT_NAMES: readonly RoleSlotName[] = ['warning', 'popupShadow'];

/** Sprite characters and the slot each one draws; `.` is transparent, role slots have no character. */
export const SPRITE_CHAR_SLOTS: Readonly<Record<string, SlotIndex>> = {
  '.': SLOT.transparent,
  w: SLOT.paper,
  o: SLOT.ink,
  b: SLOT.blue,
  i: SLOT.blueInk,
  t: SLOT.blueTint,
  p: SLOT.pink,
  k: SLOT.pinkInk,
  n: SLOT.green,
  g: SLOT.gold,
  y: SLOT.grey,
  s: SLOT.greyStrong,
  l: SLOT.greyLight,
  f: SLOT.greyFaint,
  r: SLOT.grid,
  h: SLOT.shadow,
};
