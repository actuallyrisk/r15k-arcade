import { createTranslator } from '@r15k/engine';
import type { CatalogPair, Locale, Translator } from '@r15k/engine';
import { BUG_HUNT_CATALOGS } from '@r15k/bug-hunt';
import { UI_CATALOGS } from '@r15k/ui';
import { ARCADE_CATALOGS } from '../i18n/catalogs.ts';

/** Every catalog the app's pixel text and mirror use. */
export const APP_CATALOGS: readonly CatalogPair[] = [
  UI_CATALOGS,
  BUG_HUNT_CATALOGS,
  ARCADE_CATALOGS,
];

/** A translator for a locale over every catalog of the app. */
export function translatorFor(locale: Locale): Translator {
  return createTranslator({ locale, catalogs: APP_CATALOGS });
}
