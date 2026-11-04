import { notImplemented } from '../util/assert.ts';
import type { LanguageSetting, Locale } from './catalog.ts';

/** 'system': the first preferred language starting with 'de' or 'en' wins, else 'en'. */
export function resolveLocale(
  _setting: LanguageSetting,
  _preferredLanguages: readonly string[],
): Locale {
  return notImplemented('engine.resolveLocale');
}
