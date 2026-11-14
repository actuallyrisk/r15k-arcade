import { createTranslator } from '@r15k/engine';
import type { Locale } from '@r15k/engine';
import { expect, test } from 'vitest';
import { APP_CATALOGS } from '../boot/app-translator.ts';
import { DEFAULT_SETTINGS } from '../save/save-defaults.ts';
import { applyResolvedSettings } from './apply-settings.ts';
import type { SettingsPort } from './apply-settings.ts';
import { applySettingsIntent, buildSettingsWidgets, resolveSettings } from './settings-model.ts';

/** A port that records every call. */
function recordingPort(): { readonly port: SettingsPort; readonly calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    port: {
      setLevel: (bus, level) => calls.push(`level ${bus} ${level}`),
      setMuted: (isMuted) => calls.push(`muted ${String(isMuted)}`),
      applyPalette: (id) => calls.push(`palette ${id}`),
      setLocale: (locale: Locale) => calls.push(`locale ${locale}`),
    },
  };
}

/** The environment of a light, German system without reduced motion. */
const ENVIRONMENT = {
  isDarkPreferred: false,
  isReducedMotionPreferred: false,
  languages: ['de-AT'],
};

test('resolution follows the system for system settings and the setting otherwise', () => {
  expect(resolveSettings(DEFAULT_SETTINGS, ENVIRONMENT)).toEqual({
    locale: 'de',
    paletteId: 'light',
    isReducedMotion: false,
    raw: DEFAULT_SETTINGS,
  });
  const dark = { isDarkPreferred: true, isReducedMotionPreferred: true, languages: ['fr'] };
  expect(resolveSettings(DEFAULT_SETTINGS, dark)).toMatchObject({
    locale: 'en',
    paletteId: 'dark',
    isReducedMotion: true,
  });
  const fixed = {
    ...DEFAULT_SETTINGS,
    theme: 'dark',
    language: 'en',
    reducedMotion: 'off',
  } as const;
  expect(resolveSettings(fixed, { ...dark, isDarkPreferred: false })).toMatchObject({
    locale: 'en',
    paletteId: 'dark',
    isReducedMotion: false,
  });
});

test('apply dispatches everything first, then only what changed', () => {
  const { port, calls } = recordingPort();
  const first = resolveSettings(DEFAULT_SETTINGS, ENVIRONMENT);
  applyResolvedSettings(port, undefined, first);
  expect(calls).toEqual([
    'level music 0.7',
    'level sfx 0.8',
    'muted false',
    'palette light',
    'locale de',
  ]);
  calls.length = 0;
  applyResolvedSettings(port, first, first);
  expect(calls).toEqual([]);
  const next = resolveSettings(
    { ...DEFAULT_SETTINGS, musicVolume: 30, theme: 'dark' },
    ENVIRONMENT,
  );
  applyResolvedSettings(port, first, next);
  expect(calls).toEqual(['level music 0.3', 'palette dark']);
});

test('intents change only their row, stepped and clamped', () => {
  const apply = (intent: Parameters<typeof applySettingsIntent>[1]): unknown =>
    applySettingsIntent(DEFAULT_SETTINGS, intent);
  expect(apply({ kind: 'change', id: 'music', value: 34 })).toMatchObject({ musicVolume: 30 });
  expect(apply({ kind: 'change', id: 'sfx', value: 140 })).toMatchObject({ sfxVolume: 100 });
  expect(apply({ kind: 'change', id: 'other', value: 1 })).toBe(DEFAULT_SETTINGS);
  expect(apply({ kind: 'toggle', id: 'mute', isOn: true })).toMatchObject({ isMuted: true });
  expect(apply({ kind: 'select', id: 'theme', optionId: 'dark' })).toMatchObject({ theme: 'dark' });
  expect(apply({ kind: 'select', id: 'language', optionId: 'de' })).toMatchObject({
    language: 'de',
  });
  expect(apply({ kind: 'select', id: 'motion', optionId: 'on' })).toMatchObject({
    reducedMotion: 'on',
  });
  expect(apply({ kind: 'select', id: 'intro', optionId: 'off' })).toMatchObject({ intro: 'off' });
  expect(apply({ kind: 'select', id: 'theme', optionId: 'nope' })).toEqual(DEFAULT_SETTINGS);
  expect(apply({ kind: 'back' })).toBe(DEFAULT_SETTINGS);
});

test('the widgets are the seven rows in order with catalog labels', () => {
  const i18n = createTranslator({ locale: 'de', catalogs: APP_CATALOGS });
  const rect = { x: 0, y: 0, width: 200, height: 20 };
  const widgets = buildSettingsWidgets(DEFAULT_SETTINGS, { i18n, rects: [rect] });
  expect(widgets.map((widget) => widget.id)).toEqual([
    'music',
    'sfx',
    'mute',
    'theme',
    'language',
    'motion',
    'intro',
  ]);
  expect(widgets[0]).toMatchObject({ kind: 'slider', label: 'Musik', value: 70, rect });
  expect(widgets[2]).toMatchObject({
    kind: 'toggle',
    label: 'Stumm',
    onText: 'AN',
    offText: 'AUS',
  });
  expect(widgets[4]).toMatchObject({ kind: 'selector', selectedId: 'system' });
  expect(widgets[6]?.rect).toEqual({ x: 0, y: 0, width: 0, height: 0 });
});
