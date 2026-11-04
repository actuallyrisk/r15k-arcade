import { notImplemented } from '../util/assert.ts';
import type { Locale } from './catalog.ts';

/** Plural category of a count. */
export type PluralCategory = 'one' | 'other';

/** German and English: count === 1 → 'one', else 'other'. */
export function pluralCategory(_locale: Locale, _count: number): PluralCategory {
  return notImplemented('engine.pluralCategory');
}
