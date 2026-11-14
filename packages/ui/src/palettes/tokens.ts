import type { ColorName } from '@r15k/engine';

/** r15k.dev design tokens of the light theme (translucent site values flattened onto paper), '#rrggbb'. */
export const R15K_LIGHT_TOKENS: Readonly<Record<ColorName, string>> = {
  paper: '#ffffff',
  ink: '#0c0f0a',
  blue: '#5865f2',
  blueInk: '#3b47d6',
  blueTint: '#eef0ff',
  pink: '#f4b6c2',
  pinkInk: '#e58ba0',
  green: '#2ecc71',
  gold: '#f2c14e',
  grey: '#6f736c',
  greyStrong: '#5c605a',
  greyLight: '#c9ccc6',
  greyFaint: '#eceee9',
  grid: '#eeeeee',
  shadow: '#5865f2',
  warning: '#f4b6c2',
  popupShadow: '#0c0f0a',
};

/** r15k.dev design tokens of the dark theme (translucent site values flattened onto paper), '#rrggbb'. */
export const R15K_DARK_TOKENS: Readonly<Record<ColorName, string>> = {
  paper: '#12140f',
  ink: '#f2f3ee',
  blue: '#5865f2',
  blueInk: '#9aa3ff',
  blueTint: '#171a2b',
  pink: '#f4b6c2',
  pinkInk: '#e58ba0',
  green: '#2ecc71',
  gold: '#f2c14e',
  grey: '#a8aba4',
  greyStrong: '#b9bcb5',
  greyLight: '#4d514a',
  greyFaint: '#1c1f19',
  grid: '#22241f',
  shadow: '#f2f3ee',
  warning: '#5865f2',
  popupShadow: '#12140f',
};
