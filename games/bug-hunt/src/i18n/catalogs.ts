import { defineCatalogs } from '@r15k/engine';
import type { CatalogPair } from '@r15k/engine';
import { BUG_HUNT_DE } from './de.ts';
import { BUG_HUNT_EN } from './en.ts';

/** The Bug Hunt catalogs (namespace `bugHunt`). */
export const BUG_HUNT_CATALOGS: CatalogPair = defineCatalogs({
  namespace: 'bugHunt',
  en: BUG_HUNT_EN,
  de: BUG_HUNT_DE,
});
