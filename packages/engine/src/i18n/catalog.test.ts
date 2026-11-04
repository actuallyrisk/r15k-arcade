import { expect, expectTypeOf, test } from 'vitest';
import { defineCatalogs } from './catalog.ts';
import type { CatalogPair, MatchingCatalog, Message, PluralMessage } from './catalog.ts';

test('a pair whose keys all start with the namespace is returned unchanged', () => {
  const pair = {
    namespace: 'demo',
    en: { 'demo.title': 'Title', 'demo.items': { one: '{count} item', other: '{count} items' } },
    de: { 'demo.title': 'Titel', 'demo.items': { one: '{count} Ding', other: '{count} Dinge' } },
  } as const;
  expect(defineCatalogs(pair)).toBe(pair);
});

test('a key without the namespace prefix throws and names the key', () => {
  const pair = {
    namespace: 'demo',
    en: { 'demo.title': 'Title', title: 'Title' },
    de: { 'demo.title': 'Titel', title: 'Titel' },
  } as const;
  expect(() => defineCatalogs(pair)).toThrow("catalog key 'title' is outside the namespace 'demo'");
});

test('the prefix includes the dot after the namespace', () => {
  const pair = {
    namespace: 'demo',
    en: { 'demos.title': 'Title' },
    de: { 'demos.title': 'Titel' },
  };
  expect(() => defineCatalogs(pair)).toThrow("'demos.title'");
});

test('a key only the German catalog has is checked as well', () => {
  const pair: CatalogPair = { namespace: 'demo', en: {}, de: { other: 'Andere' } };
  expect(() => defineCatalogs(pair)).toThrow("'other'");
});

const LITERAL_EN = { a: 'x', b: { one: '{count} y', other: '{count} ys' } } as const;

test('the parity pattern accepts a German catalog with the same keys and forms', () => {
  const de = {
    a: 'X',
    b: { one: '{count} Y', other: '{count} Ys' },
  } as const satisfies MatchingCatalog<typeof LITERAL_EN>;
  expect(Object.keys(de)).toEqual(Object.keys(LITERAL_EN));
});

test('the matching catalog of a literal maps strings to string and plurals to PluralMessage', () => {
  expectTypeOf<MatchingCatalog<typeof LITERAL_EN>>().toEqualTypeOf<{
    readonly a: string;
    readonly b: PluralMessage;
  }>();
});

test('the matching catalog rejects a missing key and a plain string for a plural', () => {
  expectTypeOf({ a: 'X', b: { one: 'Y', other: 'Ys' } }).toExtend<
    MatchingCatalog<typeof LITERAL_EN>
  >();
  expectTypeOf({ a: 'X' }).not.toExtend<MatchingCatalog<typeof LITERAL_EN>>();
  expectTypeOf({ a: 'X', b: 'Y' }).not.toExtend<MatchingCatalog<typeof LITERAL_EN>>();
});

test('the wide catalog pair types every German message as Message', () => {
  expectTypeOf<CatalogPair['de'][string]>().toEqualTypeOf<Message>();
  expectTypeOf<CatalogPair['en'][string]>().toEqualTypeOf<Message>();
});

test('a literal pair keeps its literal English type through defineCatalogs', () => {
  const pair = defineCatalogs({
    namespace: 'lit',
    en: { 'lit.a': 'A' },
    de: { 'lit.a': 'Ä' },
  });
  expectTypeOf(pair.en).toEqualTypeOf<{ readonly 'lit.a': 'A' }>();
  expectTypeOf(pair.de).toEqualTypeOf<{ readonly 'lit.a': string }>();
});
