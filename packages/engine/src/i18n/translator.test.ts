import { expect, test } from 'vitest';
import { defineCatalogs } from './catalog.ts';
import type { CatalogPair } from './catalog.ts';
import { createTranslator } from './translator.ts';

const GAME = defineCatalogs({
  namespace: 'game',
  en: {
    'game.title': 'Bug Hunt',
    'game.score': 'Score {score}',
    'game.lives': { one: '{count} life', other: '{count} lives' },
  },
  de: {
    'game.title': 'Käferjagd',
    'game.score': 'Punkte {score}',
    'game.lives': { one: '{count} Leben', other: '{count} Leben' },
  },
});

const MENU = defineCatalogs({
  namespace: 'menu',
  en: { 'menu.back': 'Back' },
  de: { 'menu.back': 'Zurück' },
});

test('messages come from the catalog of the locale', () => {
  const de = createTranslator({ locale: 'de', catalogs: [GAME, MENU] });
  expect(de.locale).toBe('de');
  expect(de.t('game.title')).toBe('Käferjagd');
  expect(de.t('menu.back')).toBe('Zurück');
  expect(de.t('game.score', { score: 12_345 })).toBe('Punkte 12.345');
  const en = createTranslator({ locale: 'en', catalogs: [GAME, MENU] });
  expect(en.t('game.score', { score: 12_345 })).toBe('Score 12,345');
});

test('plural messages select the form by params.count', () => {
  const en = createTranslator({ locale: 'en', catalogs: [GAME] });
  expect(en.t('game.lives', { count: 1 })).toBe('1 life');
  expect(en.t('game.lives', { count: 3 })).toBe('3 lives');
  expect(en.t('game.lives', { count: 0 })).toBe('0 lives');
});

test('a plural message without a numeric count uses the other form', () => {
  const en = createTranslator({ locale: 'en', catalogs: [GAME] });
  expect(en.t('game.lives')).toBe('{count} lives');
  expect(en.t('game.lives', { count: 'one' })).toBe('one lives');
});

test('an unknown key renders as a visible marker and has() reports it', () => {
  const en = createTranslator({ locale: 'en', catalogs: [GAME] });
  expect(en.t('game.missing')).toBe('⟦game.missing⟧');
  expect(en.has('game.missing')).toBe(false);
  expect(en.has('game.title')).toBe(true);
});

test('the transform applies to every found message but not to the marker', () => {
  const meow = createTranslator({
    locale: 'en',
    catalogs: [GAME],
    transform: (text) => text.replace(/\w+/g, 'MEOW'),
  });
  expect(meow.t('game.score', { score: 5 })).toBe('MEOW MEOW');
  expect(meow.t('game.missing')).toBe('⟦game.missing⟧');
});

test('formatInteger uses the locale of the translator', () => {
  expect(createTranslator({ locale: 'de', catalogs: [] }).formatInteger(4321)).toBe('4.321');
  expect(createTranslator({ locale: 'en', catalogs: [] }).formatInteger(4321)).toBe('4,321');
});

test('a key that two catalogs define throws and names both namespaces', () => {
  const clash: CatalogPair = {
    namespace: 'other',
    en: { 'game.title': 'X' },
    de: { 'game.title': 'X' },
  };
  expect(() => createTranslator({ locale: 'en', catalogs: [GAME, clash] })).toThrow(
    "catalog key 'game.title' is defined twice (namespaces 'game' and 'other')",
  );
  expect(() => createTranslator({ locale: 'de', catalogs: [MENU, MENU] })).toThrow("'menu.back'");
});
