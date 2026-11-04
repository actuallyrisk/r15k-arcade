import { compileFont } from '@r15k/engine';
import type { CatalogPair } from '@r15k/engine';
import { expect, test } from 'vitest';
import { fixtureFont } from './test-support/fixture-fonts.ts';
import { containerOf, FIT_RULES, textFitIssues } from './text-fit.ts';

// Every glyph is 3 px wide with 1 px letter spacing: n letters are 4n − 1 px at zoom 1.
const FONT = compileFont(fixtureFont('r15k-8', 'AÄBX×-'));

/** A catalog pair with the same text in both locales. */
const both = (namespace: string, entries: Readonly<Record<string, string>>): CatalogPair => ({
  namespace,
  en: entries,
  de: entries,
});

test.each([
  ['bugHunt.hud.score', 'hud-label'],
  ['bugHunt.hud.time', 'hud-label'],
  ['bugHunt.hud.best', 'hud-label'],
  ['bugHunt.hud.combo', 'hud-label'],
  ['bugHunt.hud.multiplier', 'hud-value'],
  ['bugHunt.banner.fridayDeploy', 'banner'],
  ['bugHunt.countdown.ready', 'banner'],
  ['bugHunt.hint.drag', 'word'],
  ['arcade.settings.reducedMotion', 'word'],
])('%s is measured as %s', (key, container) => {
  expect(containerOf(key)).toBe(container);
});

test('the containers measure at the widest text choice of their role', () => {
  expect(FIT_RULES).toEqual({
    word: { maxWidth: 236, zoom: 2, isPerWord: true },
    'hud-label': { maxWidth: 52, zoom: 1, isPerWord: false },
    'hud-value': { maxWidth: 52, zoom: 1, isPerWord: false },
    banner: { maxWidth: 236, zoom: 1, isPerWord: false },
  });
});

test('a word fits up to 236 px at zoom 2; longer words fail with width and container', () => {
  const pair = both('arcade', {
    'arcade.ok': `${'A'.repeat(29)} ${'B'.repeat(29)}`,
    'arcade.long': 'X'.repeat(30),
  });
  expect(textFitIssues([pair], FONT)).toEqual([
    `arcade.long (en): '${'X'.repeat(30)}' is 238 px wide; word allows 236 px (r15k-8 × 2)`,
    `arcade.long (de): '${'X'.repeat(30)}' is 238 px wide; word allows 236 px (r15k-8 × 2)`,
  ]);
});

test('words break after a hyphen, as wrapping does', () => {
  const pair = both('arcade', { 'arcade.hyphen': `${'A'.repeat(28)}-${'B'.repeat(28)}` });
  expect(textFitIssues([pair], FONT)).toEqual([]);
});

test('HUD strings fit as a whole up to 52 px at zoom 1, upper-cased and without placeholder values', () => {
  const pair: CatalogPair = {
    namespace: 'bugHunt',
    en: { 'bugHunt.hud.score': 'a'.repeat(13), 'bugHunt.hud.multiplier': '×{value}' },
    de: { 'bugHunt.hud.score': 'ä'.repeat(14), 'bugHunt.hud.multiplier': '×{value}' },
  };
  expect(textFitIssues([pair], FONT)).toEqual([
    `bugHunt.hud.score (de): '${'Ä'.repeat(14)}' is 55 px wide; hud-label allows 52 px (r15k-8 × 1)`,
  ]);
});

test('banners fit as a whole up to 236 px at zoom 1; DOM-only text is never measured', () => {
  const pair = both('bugHunt', {
    'bugHunt.banner.ok': 'A'.repeat(59),
    'bugHunt.countdown.long': 'A'.repeat(60),
    'bugHunt.a11y.controls': 'X'.repeat(300),
  });
  const issues = textFitIssues([pair], FONT);
  expect(issues).toHaveLength(2);
  expect(issues[0]).toBe(
    `bugHunt.countdown.long (en): '${'A'.repeat(60)}' is 239 px wide; banner allows 236 px (r15k-8 × 1)`,
  );
});

test('both forms of a plural message are measured', () => {
  const pair: CatalogPair = {
    namespace: 'arcade',
    en: { 'arcade.points': { one: 'A', other: 'X'.repeat(30) } },
    de: { 'arcade.points': { one: 'A', other: 'A' } },
  };
  expect(textFitIssues([pair], FONT)).toHaveLength(1);
});
