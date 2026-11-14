import { defineCatalogs } from '@r15k/engine';
import { ARCADE_DE } from './de.ts';
import { ARCADE_EN } from './en.ts';

/** The app catalogs (namespace `arcade`). */
export const ARCADE_CATALOGS = defineCatalogs({
  namespace: 'arcade',
  en: ARCADE_EN,
  de: ARCADE_DE,
});
