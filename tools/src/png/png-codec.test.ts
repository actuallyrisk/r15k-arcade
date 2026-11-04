import { deflateSync } from 'node:zlib';
import { expect, test } from 'vitest';
import { concatBytes, PNG_SIGNATURE, readChunks, writeChunk } from './png-chunks.ts';
import { decodePng } from './png-decode.ts';
import { encodePng } from './png-encode.ts';
import { encodeReferencePng, patternImage } from './test-support/png-fixtures.ts';

test('encode then decode returns the same image', () => {
  const image = patternImage(7, 5);
  const decoded = decodePng(encodePng(image));
  expect(decoded.width).toBe(7);
  expect(decoded.height).toBe(5);
  expect([...decoded.data]).toEqual([...image.data]);
});

test('the encoder writes signature, IHDR (8-bit RGBA, no interlace), one IDAT and IEND', () => {
  const chunks = readChunks(encodePng(patternImage(3, 2)));
  expect(chunks.map((chunk) => chunk.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
  expect([...(chunks[0]?.data ?? [])]).toEqual([0, 0, 0, 3, 0, 0, 0, 2, 8, 6, 0, 0, 0]);
});

test('the encoder rejects data of the wrong length and empty sizes', () => {
  expect(() => encodePng({ width: 2, height: 2, data: new Uint8Array(15) })).toThrow('invalid');
  expect(() => encodePng({ width: 0, height: 1, data: new Uint8Array(0) })).toThrow('invalid');
});

test.each([[[0]], [[1]], [[2]], [[3]], [[4]], [[0, 1, 2, 3, 4]]])(
  'RGBA rows with filter types %j decode exactly',
  (filterTypes) => {
    const image = patternImage(6, 5);
    const bytes = encodeReferencePng(image, { colorType: 6, filterTypes, idatCount: 1 });
    expect([...decodePng(bytes).data]).toEqual([...image.data]);
  },
);

test('RGB images decode to opaque RGBA, also from several IDAT chunks', () => {
  const image = patternImage(5, 4);
  const bytes = encodeReferencePng(image, { colorType: 2, filterTypes: [4, 3, 1], idatCount: 3 });
  const decoded = decodePng(bytes);
  const opaque = image.data.map((value, index) => (index % 4 === 3 ? 255 : value));
  expect([...decoded.data]).toEqual([...opaque]);
  expect(readChunks(bytes).filter((chunk) => chunk.type === 'IDAT')).toHaveLength(3);
});

test('a flipped bit fails the CRC check with the chunk type', () => {
  const bytes = encodePng(patternImage(2, 2)).slice();
  const idatTypeOffset = PNG_SIGNATURE.length + 25 + 4;
  bytes[idatTypeOffset + 6] = (bytes[idatTypeOffset + 6] ?? 0) ^ 1;
  expect(() => decodePng(bytes)).toThrow('PNG chunk IDAT has a wrong CRC');
});

test('a missing signature, a truncated file and a missing IHDR or IDAT throw', () => {
  const valid = encodePng(patternImage(2, 2));
  expect(() => decodePng(valid.subarray(1))).toThrow('signature');
  expect(() => decodePng(valid.subarray(0, valid.length - 6))).toThrow('truncated');
  const noHeader = concatBytes([PNG_SIGNATURE, writeChunk('IEND', new Uint8Array(0))]);
  expect(() => decodePng(noHeader)).toThrow('IHDR');
  const header = readChunks(valid)[0]?.data ?? new Uint8Array(0);
  const noData = concatBytes([
    PNG_SIGNATURE,
    writeChunk('IHDR', header),
    writeChunk('IEND', new Uint8Array(0)),
  ]);
  expect(() => decodePng(noData)).toThrow('no IDAT');
});

/** A PNG with a custom IHDR and the given row data. */
function withHeader(fields: readonly number[], rows: Uint8Array): Uint8Array {
  const header = Uint8Array.of(0, 0, 0, 1, 0, 0, 0, 1, ...fields);
  return concatBytes([
    PNG_SIGNATURE,
    writeChunk('IHDR', header),
    writeChunk('IDAT', deflateSync(rows)),
    writeChunk('IEND', new Uint8Array(0)),
  ]);
}

test.each([
  ['16-bit depth', [16, 6, 0, 0, 0]],
  ['palette colour type', [8, 3, 0, 0, 0]],
  ['grey colour type', [8, 0, 0, 0, 0]],
  ['interlacing', [8, 6, 0, 0, 1]],
])('an unsupported format (%s) throws', (_name, fields) => {
  expect(() => decodePng(withHeader(fields, Uint8Array.of(0, 1, 2, 3, 4)))).toThrow('unsupported');
});

test('an unknown filter type and image data of the wrong length throw', () => {
  expect(() => decodePng(withHeader([8, 6, 0, 0, 0], Uint8Array.of(5, 1, 2, 3, 4)))).toThrow(
    'unknown PNG filter type 5',
  );
  expect(() => decodePng(withHeader([8, 6, 0, 0, 0], Uint8Array.of(0, 1, 2)))).toThrow(
    'wrong length',
  );
});
