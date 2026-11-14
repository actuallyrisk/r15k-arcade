import { expect, test } from 'vitest';
import { crc32 } from './crc32.ts';

const ascii = (text: string): Uint8Array => new TextEncoder().encode(text);

test.each([
  ['', 0x00000000],
  ['a', 0xe8b7be43],
  ['123456789', 0xcbf43926],
  ['IEND', 0xae426082],
  ['The quick brown fox jumps over the lazy dog', 0x414fa339],
])('crc32(%j) is the ISO-HDLC check value', (text, expected) => {
  expect(crc32(ascii(text))).toBe(expected);
});

test('the result is an unsigned 32-bit integer', () => {
  const value = crc32(Uint8Array.of(0xff, 0xff, 0xff, 0xff));
  expect(value).toBeGreaterThanOrEqual(0);
  expect(value).toBeLessThanOrEqual(0xffffffff);
  expect(Number.isInteger(value)).toBe(true);
});
