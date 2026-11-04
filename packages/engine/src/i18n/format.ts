import type { Locale } from './catalog.ts';

/** Values for `{name}` placeholders. */
export type MessageParams = Readonly<Record<string, string | number>>;

/** Digit group separator per locale (written by hand, so every platform renders the same pixels). */
const GROUP_SEPARATORS: Readonly<Record<Locale, string>> = { de: '.', en: ',' };

/** Digits per group. */
const GROUP_SIZE = 3;

/** A `{name}` placeholder; the name is captured. */
const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Formats an integer with the locale's grouping (de '12.345', en '12,345'). Fractions are rounded, the
 * sign is an ASCII hyphen (every bitmap font has it), and non-finite values stay visible as 'NaN' or
 * 'Infinity' instead of turning into a plausible number.
 */
export function formatInteger(locale: Locale, value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  const rounded = Math.round(value);
  const digits = String(Math.abs(rounded));
  const groups: string[] = [];
  for (let end = digits.length; end > 0; end -= GROUP_SIZE) {
    groups.unshift(digits.slice(Math.max(0, end - GROUP_SIZE), end));
  }
  return `${rounded < 0 ? '-' : ''}${groups.join(GROUP_SEPARATORS[locale])}`;
}

/**
 * Replaces `{name}` placeholders with their parameter; numbers go through formatInteger. A placeholder
 * without a parameter stays in the text, so a missing value is visible instead of silently empty.
 */
export function interpolate(template: string, params: MessageParams, locale: Locale): string {
  return template.replace(PLACEHOLDER, (placeholder: string, name: string) => {
    const value = params[name];
    if (value === undefined) {
      return placeholder;
    }
    return typeof value === 'number' ? formatInteger(locale, value) : value;
  });
}
