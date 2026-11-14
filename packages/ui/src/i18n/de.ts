import type { MatchingCatalog } from '@r15k/engine';
import type { UI_EN } from './en.ts';

/** German UI strings. */
export const UI_DE = {
  'ui.toggle.on': 'AN',
  'ui.toggle.off': 'AUS',
  'ui.slider.percent': '{value} %',
  'ui.initials.letter': 'Buchstabe {index} von {count}',
  'ui.menu.moreAbove': '↑',
  'ui.menu.moreBelow': '↓',
  'ui.menu.scrollUp': 'Nach oben blättern',
  'ui.menu.scrollDown': 'Nach unten blättern',
} as const satisfies MatchingCatalog<typeof UI_EN>;
