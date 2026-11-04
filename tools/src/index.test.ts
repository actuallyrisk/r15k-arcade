import { expect, test } from 'vitest';
import * as tools from './index.ts';

/** Sorts names in code-unit order. */
const sorted = (list: readonly string[]): readonly string[] =>
  [...list].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/** Every runtime export of the tools entry. */
const EXPECTED = 'crc32 encodePng decodePng diffImages framebufferToImage'.split(' ');

test('the tools entry exports exactly the runtime names of the contract', () => {
  expect(sorted(Object.keys(tools))).toEqual(sorted(EXPECTED));
});
