import { addDays, weekdayOf } from './local-date.ts';
import type { LocalDate } from './local-date.ts';

/** Easter Sunday of a Gregorian year (Meeus/Jones/Butcher algorithm). */
export function easterSunday(year: number): LocalDate {
  const goldenNumber = year % 19;
  const century = Math.floor(year / 100);
  const yearOfCentury = year % 100;
  const leapCenturies = Math.floor(century / 4);
  const centuryRemainder = century % 4;
  const lunarCorrection = Math.floor((century - Math.floor((century + 8) / 25) + 1) / 3);
  const epact = (19 * goldenNumber + century - leapCenturies - lunarCorrection + 15) % 30;
  const weekdayShift =
    (32 + 2 * centuryRemainder + 2 * Math.floor(yearOfCentury / 4) - epact - (yearOfCentury % 4)) %
    7;
  const correction = Math.floor((goldenNumber + 11 * epact + 22 * weekdayShift) / 451);
  const monthDay = epact + weekdayShift - 7 * correction + 114;
  return { year, month: Math.floor(monthDay / 31), day: (monthDay % 31) + 1 };
}

/** First Advent Sunday of a year: the fourth Sunday before 25 December. */
export function firstAdventSunday(year: number): LocalDate {
  const christmasEve: LocalDate = { year, month: 12, day: 24 };
  const fourthAdvent = addDays(christmasEve, -weekdayOf(christmasEve));
  return addDays(fourthAdvent, -21);
}
