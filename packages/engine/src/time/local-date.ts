import type { Clock } from './clock.ts';

// Civil calendar arithmetic on the proleptic Gregorian calendar (Howard Hinnant's days_from_civil and
// civil_from_days), in integer operations only. Only localDateOf and localHourOf consult the device
// time zone.

/** A civil calendar date in the device time zone; `month` is 1–12. */
export interface LocalDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/** Day of the week, 0 = Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const DAYS_PER_ERA = 146_097;
/** Day number of 0000-03-01 relative to 1970-01-01. */
const EPOCH_SHIFT = 719_468;
/** 1970-01-01 was a Thursday. */
const EPOCH_WEEKDAY = 4;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local calendar date of an epoch time in the device time zone. */
export function localDateOf(epochMs: number): LocalDate {
  const date = new Date(epochMs);
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

/** Today's local date according to the clock's wall time. */
export function todayLocal(clock: Clock): LocalDate {
  return localDateOf(clock.wallTimeMs());
}

/** Local hour 0–23 of an epoch time. */
export function localHourOf(epochMs: number): number {
  return new Date(epochMs).getHours();
}

/** Formats a date as `YYYY-MM-DD`. */
export function formatLocalDate(date: LocalDate): string {
  const pad = (value: number, length: number): string => String(value).padStart(length, '0');
  return `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`;
}

/** Parses `YYYY-MM-DD`; `undefined` for anything else or an impossible date. */
export function parseLocalDate(text: string): LocalDate | undefined {
  const match = ISO_DATE.exec(text);
  if (match === null) {
    return undefined;
  }
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  if (date.month < 1 || date.month > 12 || date.day < 1) {
    return undefined;
  }
  // An impossible day (31 April, 29 February of a common year) rolls over into the next month.
  const normalised = fromDayNumber(toDayNumber(date));
  return normalised.month === date.month && normalised.day === date.day ? date : undefined;
}

/** Days since 1970-01-01 (proleptic Gregorian, days_from_civil). */
export function toDayNumber(date: LocalDate): number {
  const year = date.month <= 2 ? date.year - 1 : date.year;
  const era = Math.floor(year / 400);
  const yearOfEra = year - era * 400;
  const shiftedMonth = (date.month + 9) % 12;
  const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + date.day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * DAYS_PER_ERA + dayOfEra - EPOCH_SHIFT;
}

/** Date of a day number (inverse of toDayNumber, civil_from_days). */
export function fromDayNumber(dayNumber: number): LocalDate {
  const shifted = dayNumber + EPOCH_SHIFT;
  const era = Math.floor(shifted / DAYS_PER_ERA);
  const dayOfEra = shifted - era * DAYS_PER_ERA;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36_524) -
      Math.floor(dayOfEra / 146_096)) /
      365,
  );
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1;
  const month = shiftedMonth < 10 ? shiftedMonth + 3 : shiftedMonth - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  return { year, month, day };
}

/** Adds (or with a negative count subtracts) days. */
export function addDays(date: LocalDate, days: number): LocalDate {
  return fromDayNumber(toDayNumber(date) + days);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

/** Day of the week of a date. */
export function weekdayOf(date: LocalDate): Weekday {
  return ((((toDayNumber(date) + EPOCH_WEEKDAY) % 7) + 7) % 7) as Weekday;
}

/** Orders two dates. */
export function compareLocalDates(a: LocalDate, b: LocalDate): -1 | 0 | 1 {
  const difference = daysBetween(b, a);
  if (difference < 0) {
    return -1;
  }
  return difference > 0 ? 1 : 0;
}
