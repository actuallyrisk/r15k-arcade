import { clamp, resolveLocale } from '@r15k/engine';
import type { Rect, Translator } from '@r15k/engine';
import { resolveThemePalette } from '@r15k/ui';
import type { SelectorWidget, SliderWidget, Widget, WidgetIntent } from '@r15k/ui';
import type { ResolvedSettings } from '../boot/app-services.ts';
import type { SettingsV1 } from '../save/save-schema.ts';
import {
  INTRO_CHOICES,
  LANGUAGE_CHOICES,
  MOTION_CHOICES,
  SETTINGS_ROW_IDS,
  THEME_CHOICES,
  VOLUME_RANGE,
} from './settings-rows.ts';

/** A rect for rows the caller has not laid out (never drawn, never hit). */
const NO_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };

/** One selector row: its id, label key prefix, choices and current value. */
interface SelectorRow {
  readonly id: string;
  readonly labelKey: string;
  readonly choices: readonly string[];
  readonly selectedId: string;
}

/** A volume slider row. */
function volumeSlider(
  id: 'music' | 'sfx',
  value: number,
  context: { readonly i18n: Translator; readonly rect: Rect },
): SliderWidget {
  const { i18n, rect } = context;
  return {
    kind: 'slider',
    id,
    rect,
    label: i18n.t(`arcade.settings.${id}`),
    isDisabled: false,
    value,
    ...VOLUME_RANGE,
    valueText: i18n.t('ui.slider.percent', { value }),
  };
}

/** A selector row whose option labels are `<labelKey>.<choice>`. */
function selector(
  row: SelectorRow,
  context: { readonly i18n: Translator; readonly rect: Rect },
): SelectorWidget {
  const { i18n, rect } = context;
  return {
    kind: 'selector',
    id: row.id,
    rect,
    label: i18n.t(row.labelKey),
    isDisabled: false,
    options: row.choices.map((choice) => ({
      id: choice,
      label: i18n.t(`${row.labelKey}.${choice}`),
    })),
    selectedId: row.selectedId,
  };
}

/** The four selector rows of the settings. */
function selectorRows(settings: SettingsV1): readonly SelectorRow[] {
  const row = (
    [id, labelKey, choices]: readonly [string, string, readonly string[]],
    selectedId: string,
  ): SelectorRow => ({ id, labelKey, choices, selectedId });
  return [
    row(['theme', 'arcade.settings.theme', THEME_CHOICES], settings.theme),
    row(['language', 'arcade.settings.language', LANGUAGE_CHOICES], settings.language),
    row(['motion', 'arcade.settings.reducedMotion', MOTION_CHOICES], settings.reducedMotion),
    row(['intro', 'arcade.settings.intro', INTRO_CHOICES], settings.intro),
  ];
}

/** The settings rows as widgets, one rect per row. */
export function buildSettingsWidgets(
  settings: SettingsV1,
  context: { readonly i18n: Translator; readonly rects: readonly Rect[] },
): readonly Widget[] {
  const { i18n, rects } = context;
  const at = (id: string): { readonly i18n: Translator; readonly rect: Rect } => ({
    i18n,
    rect: rects[SETTINGS_ROW_IDS.findIndex((rowId) => rowId === id)] ?? NO_RECT,
  });
  return [
    volumeSlider('music', settings.musicVolume, at('music')),
    volumeSlider('sfx', settings.sfxVolume, at('sfx')),
    {
      kind: 'toggle',
      id: 'mute',
      ...at('mute'),
      label: i18n.t('arcade.settings.mute'),
      isDisabled: false,
      isOn: settings.isMuted,
      onText: i18n.t('ui.toggle.on'),
      offText: i18n.t('ui.toggle.off'),
    },
    ...selectorRows(settings).map((row) => selector(row, at(row.id))),
  ];
}

/** The choice with this id, if it is one of `choices`. */
function pick<T extends string>(choices: readonly T[], id: string): T | undefined {
  return choices.find((choice) => choice === id);
}

/** A volume from a slider value: stepped and clamped to 0…100. */
function volumeOf(value: number): number {
  const stepped = Math.round(value / VOLUME_RANGE.step) * VOLUME_RANGE.step;
  return clamp(stepped, VOLUME_RANGE.min, VOLUME_RANGE.max);
}

/** Applies a volume slider value to the settings (other rows change nothing). */
function applyVolume(settings: SettingsV1, id: string, value: number): SettingsV1 {
  if (id === 'music') {
    return { ...settings, musicVolume: volumeOf(value) };
  }
  return id === 'sfx' ? { ...settings, sfxVolume: volumeOf(value) } : settings;
}

/** Applies a selector choice to the settings (unknown rows or choices change nothing). */
function applySelection(settings: SettingsV1, id: string, optionId: string): SettingsV1 {
  const theme = id === 'theme' ? pick(THEME_CHOICES, optionId) : undefined;
  const language = id === 'language' ? pick(LANGUAGE_CHOICES, optionId) : undefined;
  const reducedMotion = id === 'motion' ? pick(MOTION_CHOICES, optionId) : undefined;
  const intro = id === 'intro' ? pick(INTRO_CHOICES, optionId) : undefined;
  return {
    ...settings,
    ...(theme === undefined ? {} : { theme }),
    ...(language === undefined ? {} : { language }),
    ...(reducedMotion === undefined ? {} : { reducedMotion }),
    ...(intro === undefined ? {} : { intro }),
  };
}

/** Applies a widget intent to the settings (pure). */
export function applySettingsIntent(settings: SettingsV1, intent: WidgetIntent): SettingsV1 {
  switch (intent.kind) {
    case 'change':
      return applyVolume(settings, intent.id, intent.value);
    case 'toggle':
      return intent.id === 'mute' ? { ...settings, isMuted: intent.isOn } : settings;
    case 'select':
      return applySelection(settings, intent.id, intent.optionId);
    case 'activate':
    case 'initials':
    case 'back':
      return settings;
  }
}

/** System preferences the 'system' settings follow. */
export interface SettingsEnvironment {
  readonly isDarkPreferred: boolean;
  readonly isReducedMotionPreferred: boolean;
  readonly languages: readonly string[];
}

/** Resolves the settings against the system preferences. */
export function resolveSettings(
  settings: SettingsV1,
  environment: SettingsEnvironment,
): ResolvedSettings {
  const isReducedMotion =
    settings.reducedMotion === 'system'
      ? environment.isReducedMotionPreferred
      : settings.reducedMotion === 'on';
  return {
    locale: resolveLocale(settings.language, environment.languages),
    paletteId: resolveThemePalette(settings.theme, environment.isDarkPreferred),
    isReducedMotion,
    raw: settings,
  };
}
