import { paletteFromHex } from '@r15k/engine';
import type { ColorName, PaletteColors } from '@r15k/engine';
import { R15K_DARK_TOKENS, R15K_LIGHT_TOKENS } from './tokens.ts';

/** Identifier of a palette. */
export type PaletteId = 'light' | 'dark' | 'high-contrast' | 'game-boy';

/** A palette and how the app treats it. */
export interface PaletteDefinition {
  readonly id: PaletteId;
  readonly colors: PaletteColors;
  /** game-boy: true (unlocked by a trophy in a later milestone); others false. */
  readonly isLockedByDefault: boolean;
  /** game-boy: true (overlay rendered in a later milestone). */
  readonly hasLcdGrid: boolean;
  /** CSS colour of the paper slot (body background behind the canvas). */
  readonly bodyBackground: string;
}

/** Maximum contrast on paper; items always differ by shape and outline, never by colour alone. */
const HIGH_CONTRAST_HEX: Readonly<Record<ColorName, string>> = {
  paper: '#ffffff',
  ink: '#000000',
  blue: '#0000cc',
  blueInk: '#0000cc',
  blueTint: '#d0d0ff',
  pink: '#b00050',
  pinkInk: '#b00050',
  green: '#006b1f',
  gold: '#8a5a00',
  grey: '#333333',
  greyStrong: '#1a1a1a',
  greyLight: '#666666',
  greyFaint: '#ffffff',
  grid: '#ffffff',
  shadow: '#000000',
  warning: '#ff9fc4',
  popupShadow: '#000000',
};

/** The four greens of the original Game Boy (DMG). */
const GAME_BOY_HEX: Readonly<Record<ColorName, string>> = {
  paper: '#9bbc0f',
  ink: '#0f380f',
  blue: '#306230',
  blueInk: '#0f380f',
  blueTint: '#8bac0f',
  pink: '#8bac0f',
  pinkInk: '#306230',
  green: '#306230',
  gold: '#8bac0f',
  grey: '#306230',
  greyStrong: '#0f380f',
  greyLight: '#8bac0f',
  greyFaint: '#9bbc0f',
  grid: '#8bac0f',
  shadow: '#306230',
  warning: '#8bac0f',
  popupShadow: '#0f380f',
};

/** Every palette of the app. */
export const PALETTES: Readonly<Record<PaletteId, PaletteDefinition>> = {
  light: {
    id: 'light',
    colors: paletteFromHex(R15K_LIGHT_TOKENS),
    isLockedByDefault: false,
    hasLcdGrid: false,
    bodyBackground: R15K_LIGHT_TOKENS.paper,
  },
  dark: {
    id: 'dark',
    colors: paletteFromHex(R15K_DARK_TOKENS),
    isLockedByDefault: false,
    hasLcdGrid: false,
    bodyBackground: R15K_DARK_TOKENS.paper,
  },
  'high-contrast': {
    id: 'high-contrast',
    colors: paletteFromHex(HIGH_CONTRAST_HEX),
    isLockedByDefault: false,
    hasLcdGrid: false,
    bodyBackground: HIGH_CONTRAST_HEX.paper,
  },
  'game-boy': {
    id: 'game-boy',
    colors: paletteFromHex(GAME_BOY_HEX),
    isLockedByDefault: true,
    hasLcdGrid: true,
    bodyBackground: GAME_BOY_HEX.paper,
  },
};

/** Themes the settings offer in this milestone. */
export const SELECTABLE_THEMES = ['system', 'light', 'dark'] as const;

/** A theme setting. */
export type ThemeSetting = (typeof SELECTABLE_THEMES)[number];

/** The palette of a theme setting ('system' follows the colour-scheme preference). */
export function resolveThemePalette(
  theme: ThemeSetting,
  isDarkPreferred: boolean,
): 'light' | 'dark' {
  if (theme === 'system') {
    return isDarkPreferred ? 'dark' : 'light';
  }
  return theme;
}
