import { ICONS } from './icons.ts';

/** U+0020 … U+007E. */
const BASIC_LATIN =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`' +
  'abcdefghijklmnopqrstuvwxyz{|}~';
const GERMAN = 'ÄÖÜäöüßẞ';
const TYPOGRAPHY = '×·•–—…„“”‚‘’©';
const ARROWS = '←↑→↓';

/** Every character both bitmap fonts must carry: Basic Latin, German, typography, arrows, icons. */
export const REQUIRED_CHARSET: string =
  BASIC_LATIN + GERMAN + TYPOGRAPHY + ARROWS + Object.values(ICONS).join('');
