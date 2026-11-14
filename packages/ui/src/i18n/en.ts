import type { CatalogShape } from '@r15k/engine';

/** English UI strings. */
export const UI_EN = {
  'ui.toggle.on': 'ON',
  'ui.toggle.off': 'OFF',
  'ui.slider.percent': '{value} %',
  'ui.initials.letter': 'Letter {index} of {count}',
  'ui.menu.moreAbove': '↑',
  'ui.menu.moreBelow': '↓',
  'ui.menu.scrollUp': 'Scroll up',
  'ui.menu.scrollDown': 'Scroll down',
} as const satisfies CatalogShape;
