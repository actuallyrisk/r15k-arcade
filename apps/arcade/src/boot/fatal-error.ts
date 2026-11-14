import { resolveLocale } from '@r15k/engine';
import { ARCADE_CATALOGS } from '../i18n/catalogs.ts';
import { hasFatalDetails } from './fatal-details.ts';

/** The error text a development build appends. */
function detailOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Shows the localised "could not start" message in the #fatal box; never throws. */
export function showFatalError(document: Document, error: unknown): void {
  try {
    const languages = document.defaultView?.navigator.languages ?? [];
    const locale = resolveLocale('system', languages);
    const message = ARCADE_CATALOGS[locale]['arcade.fatal.message'];
    const box = document.getElementById('fatal');
    if (box === null) {
      return;
    }
    box.textContent = hasFatalDetails() ? `${message}\n${detailOf(error)}` : message;
    box.hidden = false;
  } catch (_error: unknown) {
    // The page cannot even show its failure; nothing else is left to try.
  }
}
