import { expect, test } from 'vitest';
import { hashCanonical } from '../math/hash.ts';
import { decodeSaveExport, encodeSaveExport } from './save-export.ts';

const DOCUMENT = {
  schemaVersion: 1,
  scores: [{ initials: 'ABC', score: 42 }],
  meta: { launches: 3 },
};

test('save export: round trip keeps the document and the schema version', () => {
  const text = encodeSaveExport(DOCUMENT, 1);
  expect(decodeSaveExport(text)).toEqual({
    ok: true,
    value: { schemaVersion: 1, document: DOCUMENT },
  });
});

test('save export: the file names its format first and carries the canonical checksum', () => {
  const text = encodeSaveExport(DOCUMENT, 1);
  expect(text.startsWith('{"format":"r15k-arcade-save","schemaVersion":1,"checksum":"')).toBe(true);
  expect(JSON.parse(text)).toMatchObject({ checksum: hashCanonical(DOCUMENT) });
});

test('save export: a member set to undefined survives as null and passes its own checksum', () => {
  const text = encodeSaveExport({ name: 'x', missing: undefined, list: [undefined, 1] }, 2);
  expect(decodeSaveExport(text)).toEqual({
    ok: true,
    value: { schemaVersion: 2, document: { list: [null, 1], missing: null, name: 'x' } },
  });
});

test('save export: a changed document fails the checksum', () => {
  const text = encodeSaveExport(DOCUMENT, 1).replace('"score":42', '"score":43');
  expect(decodeSaveExport(text)).toEqual({ ok: false, error: 'checksum mismatch' });
});

test('save export: anything else is rejected with a reason', () => {
  expect(decodeSaveExport('{')).toEqual({ ok: false, error: 'not a JSON file' });
  expect(decodeSaveExport('null')).toEqual({ ok: false, error: 'not a save export' });
  expect(decodeSaveExport('{"format":"r15k-arcade-save"}')).toEqual({
    ok: false,
    error: 'not a save export',
  });
  const other = JSON.stringify({ format: 'other', schemaVersion: 1, checksum: '', document: {} });
  expect(decodeSaveExport(other)).toEqual({ ok: false, error: 'not a save export' });
  const badVersion = encodeSaveExport(DOCUMENT, 0);
  expect(decodeSaveExport(badVersion)).toEqual({ ok: false, error: 'invalid schema version' });
});
