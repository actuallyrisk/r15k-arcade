import { expect, test } from 'vitest';
import { encodeWav } from './wav.ts';

/** The ASCII text of four bytes. */
const tagAt = (bytes: Uint8Array, offset: number): string =>
  String.fromCharCode(...bytes.subarray(offset, offset + 4));

test('the header describes 16-bit mono PCM at the sample rate', () => {
  const bytes = encodeWav(new Float32Array(10), 48_000);
  const view = new DataView(bytes.buffer);
  expect(bytes).toHaveLength(44 + 20);
  expect([tagAt(bytes, 0), tagAt(bytes, 8), tagAt(bytes, 12), tagAt(bytes, 36)]).toEqual([
    'RIFF',
    'WAVE',
    'fmt ',
    'data',
  ]);
  expect(view.getUint32(4, true)).toBe(36 + 20);
  expect(view.getUint32(16, true)).toBe(16);
  expect(view.getUint16(20, true)).toBe(1);
  expect(view.getUint16(22, true)).toBe(1);
  expect(view.getUint32(24, true)).toBe(48_000);
  expect(view.getUint32(28, true)).toBe(96_000);
  expect(view.getUint16(32, true)).toBe(2);
  expect(view.getUint16(34, true)).toBe(16);
  expect(view.getUint32(40, true)).toBe(20);
});

test('samples are clamped to [−1, 1], scaled by 32767 and rounded, little endian', () => {
  const bytes = encodeWav(new Float32Array([0, 1, -1, 0.5, 2, -3, 0.25]), 48_000);
  const view = new DataView(bytes.buffer);
  const samples = Array.from({ length: 7 }, (_, index) => view.getInt16(44 + index * 2, true));
  expect(samples).toEqual([0, 32_767, -32_767, 16_384, 32_767, -32_767, 8192]);
  expect([...bytes.subarray(46, 48)]).toEqual([0xff, 0x7f]);
});
