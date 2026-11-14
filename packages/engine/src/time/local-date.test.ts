import { expect, test } from 'vitest';
import { createFakeClock } from './clock.ts';
import {
  addDays,
  compareLocalDates,
  daysBetween,
  formatLocalDate,
  fromDayNumber,
  localDateOf,
  localHourOf,
  parseLocalDate,
  todayLocal,
  toDayNumber,
  weekdayOf,
} from './local-date.ts';

test('localDateOf and localHourOf read the device time zone', () => {
  const epochMs = new Date(2026, 10, 4, 23, 30).getTime();
  expect(localDateOf(epochMs)).toEqual({ year: 2026, month: 11, day: 4 });
  expect(localHourOf(epochMs)).toBe(23);
  expect(localHourOf(new Date(2026, 0, 1, 0, 5).getTime())).toBe(0);
});

test('todayLocal uses the wall time of the clock', () => {
  const clock = createFakeClock({ wallTimeMs: new Date(2024, 1, 29, 12).getTime() });
  expect(todayLocal(clock)).toEqual({ year: 2024, month: 2, day: 29 });
});

test('day numbers count from 1970-01-01', () => {
  expect(toDayNumber({ year: 1970, month: 1, day: 1 })).toBe(0);
  expect(toDayNumber({ year: 1969, month: 12, day: 31 })).toBe(-1);
  expect(toDayNumber({ year: 2000, month: 3, day: 1 })).toBe(11_017);
  expect(toDayNumber({ year: 2026, month: 11, day: 4 })).toBe(1_793_750_400_000 / 86_400_000);
  expect(fromDayNumber(0)).toEqual({ year: 1970, month: 1, day: 1 });
  expect(fromDayNumber(-719_468)).toEqual({ year: 0, month: 3, day: 1 });
});

test('fromDayNumber inverts toDayNumber and walks day by day', () => {
  let previous = fromDayNumber(-200_001);
  for (let dayNumber = -200_000; dayNumber <= 200_000; dayNumber += 7) {
    const date = fromDayNumber(dayNumber);
    expect(toDayNumber(date)).toBe(dayNumber);
    expect(compareLocalDates(previous, date)).toBe(-1);
    previous = date;
  }
});

test('leap years follow the Gregorian rules', () => {
  expect(addDays({ year: 2024, month: 2, day: 28 }, 1)).toEqual({ year: 2024, month: 2, day: 29 });
  expect(addDays({ year: 2023, month: 2, day: 28 }, 1)).toEqual({ year: 2023, month: 3, day: 1 });
  expect(addDays({ year: 1900, month: 2, day: 28 }, 1)).toEqual({ year: 1900, month: 3, day: 1 });
  expect(addDays({ year: 2000, month: 2, day: 28 }, 1)).toEqual({ year: 2000, month: 2, day: 29 });
  expect(daysBetween({ year: 2024, month: 1, day: 1 }, { year: 2025, month: 1, day: 1 })).toBe(366);
  expect(daysBetween({ year: 2025, month: 1, day: 1 }, { year: 2024, month: 12, day: 31 })).toBe(
    -1,
  );
});

test('addDays crosses month and year ends in both directions', () => {
  expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({ year: 2027, month: 1, day: 1 });
  expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({ year: 2026, month: 2, day: 28 });
  expect(addDays({ year: 2026, month: 11, day: 4 }, 0)).toEqual({ year: 2026, month: 11, day: 4 });
});

test('weekdayOf counts from Sunday = 0', () => {
  expect(weekdayOf({ year: 1970, month: 1, day: 1 })).toBe(4);
  expect(weekdayOf({ year: 2026, month: 11, day: 4 })).toBe(3);
  expect(weekdayOf({ year: 2026, month: 11, day: 29 })).toBe(0);
  expect(weekdayOf({ year: 1969, month: 12, day: 27 })).toBe(6);
});

test('compareLocalDates orders by calendar', () => {
  const day = { year: 2026, month: 5, day: 10 };
  expect(compareLocalDates(day, { year: 2026, month: 5, day: 10 })).toBe(0);
  expect(compareLocalDates(day, { year: 2026, month: 5, day: 11 })).toBe(-1);
  expect(compareLocalDates(day, { year: 2025, month: 12, day: 31 })).toBe(1);
});

test('formatLocalDate pads to YYYY-MM-DD', () => {
  expect(formatLocalDate({ year: 2026, month: 11, day: 4 })).toBe('2026-11-04');
  expect(formatLocalDate({ year: 7, month: 3, day: 9 })).toBe('0007-03-09');
});

test('parseLocalDate accepts exactly real YYYY-MM-DD dates', () => {
  expect(parseLocalDate('2026-11-04')).toEqual({ year: 2026, month: 11, day: 4 });
  expect(parseLocalDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
  for (const text of ['2023-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '2026-01-00']) {
    expect(parseLocalDate(text)).toBeUndefined();
  }
  for (const text of ['2026-1-04', ' 2026-11-04', '2026-11-04T00:00', 'today', '']) {
    expect(parseLocalDate(text)).toBeUndefined();
  }
});
