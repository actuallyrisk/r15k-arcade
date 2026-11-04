import type { CatalogPair } from '@r15k/engine';
import { expect, test } from 'vitest';
import { catalogIssues, loadCatalogs, NAMESPACES, parseNamespaces } from './check.ts';
import type { CatalogImporters, LoadedCatalogs, NamespaceId } from './check.ts';
import { fixtureFont } from './test-support/fixture-fonts.ts';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!?:+-.×';

/** Loaded catalogs with fonts that know every letter (r15k-5 lacks `×`). */
const loaded = (catalogs: readonly CatalogPair[]): LoadedCatalogs => ({
  catalogs,
  small: fixtureFont('r15k-5', LETTERS.replace('×', '')),
  large: fixtureFont('r15k-8', LETTERS),
});

const UI: CatalogPair = {
  namespace: 'ui',
  en: { 'ui.toggle.on': 'On', 'ui.letter': { one: '{count} letter', other: '{count} letters' } },
  de: {
    'ui.toggle.on': 'An',
    'ui.letter': { one: '{count} Buchstabe', other: '{count} Buchstaben' },
  },
};

test('complete, consistent catalogs pass', () => {
  expect(catalogIssues(loaded([UI]))).toEqual([]);
});

test('missing keys, a different plural shape and different placeholders are reported per key', () => {
  const pair: CatalogPair = {
    namespace: 'ui',
    en: { 'ui.a': 'A', 'ui.b': 'B {value}', 'ui.c': { one: 'C', other: 'CS' }, 'ui.d': 'D' },
    de: { 'ui.b': 'B {wert}', 'ui.c': 'C', 'ui.d': 'D', 'ui.e': 'E' },
  };
  expect(catalogIssues(loaded([pair]))).toEqual([
    'ui.a: missing in de',
    'ui.e: missing in en',
    'ui.b: placeholders differ (en {value}, de {wert})',
    'ui.c: plural shape differs between en and de',
  ]);
});

test('empty strings, keys outside the namespace and keys in two catalogs are reported', () => {
  const ui: CatalogPair = {
    namespace: 'ui',
    en: { 'ui.a': ' ', 'arcade.x': 'X', 'ui.p': { one: '', other: 'P' } },
    de: { 'ui.a': 'A', 'arcade.x': 'X', 'ui.p': { one: 'P', other: 'P' } },
  };
  const arcade: CatalogPair = {
    namespace: 'arcade',
    en: { 'arcade.x': 'X' },
    de: { 'arcade.x': 'X' },
  };
  expect(catalogIssues(loaded([ui, arcade]))).toEqual([
    'ui.a (en): empty string',
    "arcade.x (en): outside the namespace 'ui'",
    'ui.p (en): empty string',
    "arcade.x (de): outside the namespace 'ui'",
    "arcade.x: defined in the catalogs 'ui' and 'arcade'",
  ]);
});

test('drawn characters must exist in r15k-8, HUD and popup keys also in r15k-5; DOM text is skipped', () => {
  const pair: CatalogPair = {
    namespace: 'bugHunt',
    en: {
      'bugHunt.hud.multiplier': '×{value}',
      'bugHunt.title': 'Bug Hunt ×',
      'bugHunt.mode': 'Straße',
      'bugHunt.a11y.field': 'Spielfeld ✓',
      'bugHunt.hint': 'Ä',
    },
    de: {
      'bugHunt.hud.multiplier': '×{value}',
      'bugHunt.title': 'Bug Hunt ×',
      'bugHunt.mode': 'Straße',
      'bugHunt.a11y.field': 'Spielfeld ✓',
      'bugHunt.hint': 'ä',
    },
  };
  expect(catalogIssues(loaded([pair]))).toEqual([
    "bugHunt.hud.multiplier (en): '×' is missing from r15k-5",
    "bugHunt.hint (en): 'Ä' is missing from r15k-8",
    "bugHunt.hud.multiplier (de): '×' is missing from r15k-5",
    "bugHunt.hint (de): 'Ä' is missing from r15k-8",
  ]);
});

test('DOM-only keys are never glyph-checked', () => {
  const ui: CatalogPair = {
    namespace: 'ui',
    en: { 'ui.menu.scrollUp': 'Scroll ↑', 'ui.menu.scrollDown': 'Scroll ↓' },
    de: { 'ui.menu.scrollUp': 'Hoch ↑', 'ui.menu.scrollDown': 'Runter ↓' },
  };
  const arcade: CatalogPair = {
    namespace: 'arcade',
    en: { 'arcade.fatal.message': 'Could not start ✗', 'arcade.initials.label': 'Initials ✎' },
    de: { 'arcade.fatal.message': 'Start fehlgeschlagen ✗', 'arcade.initials.label': 'Kürzel ✎' },
  };
  expect(catalogIssues(loaded([ui, arcade]))).toEqual([]);
});

test('--only accepts a comma-separated list of known namespaces', () => {
  expect(parseNamespaces(undefined)).toEqual(NAMESPACES);
  expect(parseNamespaces('arcade, ui')).toEqual(['ui', 'arcade']);
  expect(() => parseNamespaces('ui,bug-hunt')).toThrow("unknown namespace(s) 'bug-hunt'");
  expect(() => parseNamespaces(',')).toThrow('unknown namespace');
});

/** Importers that record which package was loaded. */
function recordingImporters(imported: string[]): CatalogImporters {
  const pair = (namespace: string): CatalogPair => ({ namespace, en: {}, de: {} });
  return {
    ui: () => {
      imported.push('ui');
      return Promise.resolve({
        UI_CATALOGS: pair('ui'),
        R15K_5: fixtureFont('r15k-5', ''),
        R15K_8: fixtureFont('r15k-8', ''),
      });
    },
    bugHunt: () => {
      imported.push('bugHunt');
      return Promise.resolve({ BUG_HUNT_CATALOGS: pair('bugHunt') });
    },
    arcade: () => {
      imported.push('arcade');
      return Promise.resolve({ ARCADE_CATALOGS: pair('arcade') });
    },
  };
}

test.each<[readonly NamespaceId[], readonly string[]]>([
  [['ui'], ['ui']],
  [['bugHunt'], ['ui', 'bugHunt']],
  [['arcade'], ['ui', 'arcade']],
  [NAMESPACES, ['ui', 'bugHunt', 'arcade']],
])(
  'namespaces %j import only the packages %j (ui always, for the fonts)',
  async (namespaces, packages) => {
    const imported: string[] = [];
    const result = await loadCatalogs(namespaces, recordingImporters(imported));
    expect(imported).toEqual(packages);
    expect(result.catalogs.map((pair) => pair.namespace)).toEqual(namespaces);
    expect(result.small.id).toBe('r15k-5');
    expect(result.large.id).toBe('r15k-8');
  },
);
