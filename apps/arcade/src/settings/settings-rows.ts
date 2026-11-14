/** The settings rows in display order (the Back button lives in the title bar, not here). */
export const SETTINGS_ROW_IDS = [
  'music',
  'sfx',
  'mute',
  'theme',
  'language',
  'motion',
  'intro',
] as const;

/** Identifier of a settings row (also the widget id). */
export type SettingsRowId = (typeof SETTINGS_ROW_IDS)[number];

/** Values of the theme selector. */
export const THEME_CHOICES = ['system', 'light', 'dark'] as const;
/** Values of the language selector. */
export const LANGUAGE_CHOICES = ['system', 'de', 'en'] as const;
/** Values of the reduced-motion selector. */
export const MOTION_CHOICES = ['system', 'on', 'off'] as const;
/** Values of the intro selector. */
export const INTRO_CHOICES = ['full', 'short', 'off'] as const;

/** Volume sliders: 0…100 % in steps of 10. */
export const VOLUME_RANGE = { min: 0, max: 100, step: 10 } as const;
