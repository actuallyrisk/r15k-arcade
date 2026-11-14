import type { LanguageSetting, Locale } from './catalog.ts';

/** Locales the app ships, matched against the primary subtag of a language tag. */
const SUPPORTED: readonly Locale[] = ['de', 'en'];

/** The fallback for every other system language. */
const FALLBACK: Locale = 'en';

/** The supported locale of a BCP 47 tag ('de-AT' → 'de', 'en_GB' → 'en'), if any. */
function localeOfTag(tag: string): Locale | undefined {
  const primary = tag.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED.find((locale) => locale === primary);
}

/**
 * Resolves the language setting. 'system': the first preferred language whose primary subtag is 'de' or
 * 'en' wins (so ['fr-FR', 'de-DE'] gives 'de'), else 'en'.
 */
export function resolveLocale(
  setting: LanguageSetting,
  preferredLanguages: readonly string[],
): Locale {
  if (setting !== 'system') {
    return setting;
  }
  for (const tag of preferredLanguages) {
    const locale = localeOfTag(tag);
    if (locale !== undefined) {
      return locale;
    }
  }
  return FALLBACK;
}
