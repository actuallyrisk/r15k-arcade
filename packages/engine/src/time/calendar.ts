import { notImplemented } from '../util/assert.ts';
import type { LocalDate } from './local-date.ts';

/** Easter Sunday of a year (Meeus/Jones/Butcher). */
export function easterSunday(_year: number): LocalDate {
  return notImplemented('engine.easterSunday');
}

/** First Advent Sunday of a year (the fourth Sunday before 25 December). */
export function firstAdventSunday(_year: number): LocalDate {
  return notImplemented('engine.firstAdventSunday');
}
