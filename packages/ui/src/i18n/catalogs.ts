import { defineCatalogs } from '@r15k/engine';
import type { CatalogPair } from '@r15k/engine';
import { UI_DE } from './de.ts';
import { UI_EN } from './en.ts';

/** The UI catalogs (namespace `ui`). */
export const UI_CATALOGS: CatalogPair = defineCatalogs({ namespace: 'ui', en: UI_EN, de: UI_DE });
