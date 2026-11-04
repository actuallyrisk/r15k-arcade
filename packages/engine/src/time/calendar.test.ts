import { expect, test } from 'vitest';
import { easterSunday, firstAdventSunday } from './calendar.ts';
import { formatLocalDate, weekdayOf } from './local-date.ts';

test('easterSunday matches the published dates', () => {
  const dates = [2024, 2025, 2026, 2027, 2028, 2029, 2030].map((year) =>
    formatLocalDate(easterSunday(year)),
  );
  expect(dates).toEqual([
    '2024-03-31',
    '2025-04-20',
    '2026-04-05',
    '2027-03-28',
    '2028-04-16',
    '2029-04-01',
    '2030-04-21',
  ]);
});

test('easterSunday reaches both extremes of its range', () => {
  expect(formatLocalDate(easterSunday(1818))).toBe('1818-03-22');
  expect(formatLocalDate(easterSunday(2038))).toBe('2038-04-25');
  expect(formatLocalDate(easterSunday(2000))).toBe('2000-04-23');
  for (let year = 1900; year <= 2100; year += 1) {
    expect(weekdayOf(easterSunday(year))).toBe(0);
  }
});

test('firstAdventSunday is the fourth Sunday before Christmas', () => {
  expect(formatLocalDate(firstAdventSunday(2026))).toBe('2026-11-29');
  // 25 December 2022 was a Sunday, so the fourth Advent was 18 December.
  expect(formatLocalDate(firstAdventSunday(2022))).toBe('2022-11-27');
  // 24 December 2023 was a Sunday and itself the fourth Advent.
  expect(formatLocalDate(firstAdventSunday(2023))).toBe('2023-12-03');
  for (let year = 2000; year <= 2100; year += 1) {
    const advent = firstAdventSunday(year);
    expect(weekdayOf(advent)).toBe(0);
    expect(formatLocalDate(advent) >= `${year}-11-27`).toBe(true);
    expect(formatLocalDate(advent) <= `${year}-12-03`).toBe(true);
  }
});
