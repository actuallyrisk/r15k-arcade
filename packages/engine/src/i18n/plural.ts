import type { Locale } from './catalog.ts';

/** Plural category of a count. */
export type PluralCategory = 'one' | 'other';

/** Whether a count takes the singular form ("1 Punkt", "1 point"). */
const isExactlyOne = (count: number): boolean => count === 1;

/** One rule per locale, so a language with other plural rules only adds an entry here. */
const SINGULAR_RULES: Readonly<Record<Locale, (count: number) => boolean>> = {
  de: isExactlyOne,
  en: isExactlyOne,
};

/** German and English: count === 1 → 'one', else 'other' (0, 2, 1.5 and negative counts are plural). */
export function pluralCategory(locale: Locale, count: number): PluralCategory {
  return SINGULAR_RULES[locale](count) ? 'one' : 'other';
}
