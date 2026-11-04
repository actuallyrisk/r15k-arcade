/** Name of an icon glyph of the bitmap fonts. */
export type IconName =
  | 'button-a'
  | 'button-b'
  | 'button-start'
  | 'dpad'
  | 'stick'
  | 'key-enter'
  | 'key-escape'
  | 'key-space'
  | 'key-arrows'
  | 'mouse'
  | 'touch'
  | 'cat-head'
  | 'note'
  | 'sound-on'
  | 'sound-off'
  | 'check'
  | 'cross'
  | 'star'
  | 'pause'
  | 'play'
  | 'gear'
  | 'back'
  | 'trophy'
  | 'bug'
  | 'bomb'
  | 'lock';

/** Private-use code points of the icon glyphs, U+E000 … U+E019 in this order. */
export const ICONS: Readonly<Record<IconName, string>> = {
  'button-a': '',
  'button-b': '',
  'button-start': '',
  dpad: '',
  stick: '',
  'key-enter': '',
  'key-escape': '',
  'key-space': '',
  'key-arrows': '',
  mouse: '',
  touch: '',
  'cat-head': '',
  note: '',
  'sound-on': '',
  'sound-off': '',
  check: '',
  cross: '',
  star: '',
  pause: '',
  play: '',
  gear: '',
  back: '',
  trophy: '',
  bug: '',
  bomb: '',
  lock: '',
};
