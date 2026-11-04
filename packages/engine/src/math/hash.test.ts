import { expect, test } from 'vitest';
import { canonicalJson, fnv1a32, hashCanonical, toHex32 } from './hash.ts';

test('fnv1a32 matches the reference vectors', () => {
  expect(fnv1a32('')).toBe(0x811c9dc5);
  expect(fnv1a32('a')).toBe(0xe40c292c);
  expect(fnv1a32('r15k')).toBe(0x9b7faa10);
});

test('fnv1a32 hashes the UTF-8 bytes', () => {
  // 'ä' is C3 A4 in UTF-8: two bytes, not the single UTF-16 code unit E4.
  let expected = 0x811c9dc5;
  for (const byte of [0xc3, 0xa4]) {
    expected = Math.imul(expected ^ byte, 0x01000193);
  }
  expect(fnv1a32('ä')).toBe(expected >>> 0);
});

test('toHex32 writes eight lower-case digits', () => {
  expect(toHex32(0)).toBe('00000000');
  expect(toHex32(0x9b7faa10)).toBe('9b7faa10');
  expect(toHex32(-1)).toBe('ffffffff');
});

test('canonicalJson sorts object keys by code unit at every level', () => {
  const value = { b: 1, a: { z: true, Z: false, é: 'x' }, '10': null, '9': [3, 'q'] };
  expect(canonicalJson(value)).toBe(
    '{"10":null,"9":[3,"q"],"a":{"Z":false,"z":true,"é":"x"},"b":1}',
  );
});

test('canonicalJson writes undefined as null and -0 as 0', () => {
  expect(canonicalJson(undefined)).toBe('null');
  expect(canonicalJson({ aim: undefined })).toBe('{"aim":null}');
  const withHole: unknown[] = [1];
  withHole[2] = undefined;
  expect(canonicalJson(withHole)).toBe('[1,null,null]');
  expect(canonicalJson(-0)).toBe('0');
  expect(canonicalJson({ x: -0, y: 1.5e-7 })).toBe('{"x":0,"y":1.5e-7}');
});

test('canonicalJson escapes strings like JSON', () => {
  expect(canonicalJson('a"b\n\u{1f408}')).toBe(JSON.stringify('a"b\n\u{1f408}'));
});

test('canonicalJson rejects values without a JSON form', () => {
  expect(() => canonicalJson(Number.NaN)).toThrow(TypeError);
  expect(() => canonicalJson({ x: Number.POSITIVE_INFINITY })).toThrow(TypeError);
  expect(() => canonicalJson({ run: () => 1 })).toThrow('cannot encode a function');
  expect(() => canonicalJson(Symbol('s'))).toThrow('cannot encode a symbol');
  expect(() => canonicalJson(1n)).toThrow('cannot encode a bigint');
});

test('canonicalJson rejects cycles but accepts shared references', () => {
  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  expect(() => canonicalJson(cyclic)).toThrow('cyclic structure');
  const shared = { n: 1 };
  expect(canonicalJson([shared, shared])).toBe('[{"n":1},{"n":1}]');
});

test('hashCanonical ignores key order', () => {
  const hash = hashCanonical({ a: 1, b: [2, 3] });
  expect(hash).toBe(hashCanonical({ b: [2, 3], a: 1 }));
  expect(hash).toBe(toHex32(fnv1a32('{"a":1,"b":[2,3]}')));
  expect(hash).toMatch(/^[0-9a-f]{8}$/);
});
