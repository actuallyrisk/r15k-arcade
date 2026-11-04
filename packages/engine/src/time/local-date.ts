import { notImplemented } from '../util/assert.ts';
import type { Clock } from './clock.ts';

/** A civil calendar date in the device time zone; `month` is 1–12. */
export interface LocalDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/** Day of the week, 0 = Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Local calendar date of an epoch time in the device time zone. */
export function localDateOf(_epochMs: number): LocalDate {
  return notImplemented('engine.localDateOf');
}

/** Today's local date according to the clock's wall time. */
export function todayLocal(_clock: Clock): LocalDate {
  return notImplemented('engine.todayLocal');
}

/** Local hour 0–23 of an epoch time. */
export function localHourOf(_epochMs: number): number {
  return notImplemented('engine.localHourOf');
}

/** Formats a date as `YYYY-MM-DD`. */
export function formatLocalDate(_date: LocalDate): string {
  return notImplemented('engine.formatLocalDate');
}

/** Parses `YYYY-MM-DD`; `undefined` for anything else or an impossible date. */
export function parseLocalDate(_text: string): LocalDate | undefined {
  return notImplemented('engine.parseLocalDate');
}

/** Days since 1970-01-01 (proleptic Gregorian, days_from_civil). */
export function toDayNumber(_date: LocalDate): number {
  return notImplemented('engine.toDayNumber');
}

/** Date of a day number (inverse of toDayNumber). */
export function fromDayNumber(_dayNumber: number): LocalDate {
  return notImplemented('engine.fromDayNumber');
}

/** Adds (or with a negative count subtracts) days. */
export function addDays(_date: LocalDate, _days: number): LocalDate {
  return notImplemented('engine.addDays');
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(_from: LocalDate, _to: LocalDate): number {
  return notImplemented('engine.daysBetween');
}

/** Day of the week of a date. */
export function weekdayOf(_date: LocalDate): Weekday {
  return notImplemented('engine.weekdayOf');
}

/** Orders two dates. */
export function compareLocalDates(_a: LocalDate, _b: LocalDate): -1 | 0 | 1 {
  return notImplemented('engine.compareLocalDates');
}
