import { expect, test } from 'vitest';
import { defineCatalogs } from './catalog.ts';

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
