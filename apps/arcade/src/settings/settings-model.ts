import { notImplemented } from '@r15k/engine';
import type { Rect, Translator } from '@r15k/engine';
import type { Widget, WidgetIntent } from '@r15k/ui';
import type { ResolvedSettings } from '../boot/app-services.ts';
import type { SettingsV1 } from '../save/save-schema.ts';

/** The settings rows as widgets, one rect per row. */
export function buildSettingsWidgets(
  _settings: SettingsV1,
  _context: { readonly i18n: Translator; readonly rects: readonly Rect[] },
): readonly Widget[] {
  return notImplemented('arcade.buildSettingsWidgets');
}

/** Applies a widget intent to the settings (pure). */
export function applySettingsIntent(_settings: SettingsV1, _intent: WidgetIntent): SettingsV1 {
  return notImplemented('arcade.applySettingsIntent');
}

/** System preferences the 'system' settings follow. */
export interface SettingsEnvironment {
  readonly isDarkPreferred: boolean;
  readonly isReducedMotionPreferred: boolean;
  readonly languages: readonly string[];
}

/** Resolves the settings against the system preferences. */
export function resolveSettings(
  _settings: SettingsV1,
  _environment: SettingsEnvironment,
): ResolvedSettings {
  return notImplemented('arcade.resolveSettings');
}
