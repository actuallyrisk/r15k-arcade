import { expect, test } from 'vitest';
import { resolveLocale } from './locale.ts';

test('a fixed setting wins over the system languages', () => {
  expect(resolveLocale('de', ['en-US'])).toBe('de');
  expect(resolveLocale('en', ['de-DE'])).toBe('en');
});

test.each([
  [['de-DE', 'en-US'], 'de'],
  [['de'], 'de'],
  [['de-AT'], 'de'],
  [['DE-ch'], 'de'],
  [['en-GB', 'de-DE'], 'en'],
  [['fr-FR', 'de-DE'], 'de'],
  [['fr-FR', 'en_US'], 'en'],
  [['fr-FR', 'it-IT'], 'en'],
  [['den-CA'], 'en'],
  [[], 'en'],
] as const)('system with %j resolves to %j', (languages, locale) => {
  expect(resolveLocale('system', languages)).toBe(locale);
});
