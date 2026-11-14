import { expect, test } from 'vitest';
import { scanMp3Frames } from './mp3-frames.ts';

/** Bytes of a 96 kbps, 48 kHz MPEG-1 Layer III frame without padding. */
const FRAME_BYTES = 288;

/** A silent mono frame (no CRC), optionally carrying a gapless tag after its side information. */
function frame(options: { readonly tag?: string; readonly isPadded?: boolean } = {}): Uint8Array {
  const bytes = new Uint8Array(FRAME_BYTES + (options.isPadded === true ? 1 : 0));
  bytes.set([0xff, 0xfb, options.isPadded === true ? 0x76 : 0x74, 0xc4]);
  // The tag follows the 4 header bytes and the 17 bytes of mono side information.
  bytes.set(new TextEncoder().encode(options.tag ?? ''), 4 + 17);
  return bytes;
}

/** Concatenates byte arrays. */
const join = (...parts: readonly Uint8Array[]): Uint8Array => {
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  parts.reduce((offset, part) => {
    bytes.set(part, offset);
    return offset + part.length;
  }, 0);
  return bytes;
};

test('audio frames are counted, padded frames included', () => {
  expect(scanMp3Frames(join(frame(), frame({ isPadded: true }), frame()))).toEqual({
    audioFrames: 3,
    hasInfoTag: false,
    samplesPerFrame: 1152,
  });
});

test('a leading Xing or Info frame is detected and not counted', () => {
  expect(scanMp3Frames(join(frame({ tag: 'Info' }), frame(), frame()))).toMatchObject({
    audioFrames: 2,
    hasInfoTag: true,
  });
  expect(scanMp3Frames(join(frame({ tag: 'Xing' }), frame()))).toMatchObject({
    audioFrames: 1,
    hasInfoTag: true,
  });
  expect(scanMp3Frames(join(frame(), frame({ tag: 'Info' })))).toMatchObject({
    audioFrames: 2,
    hasInfoTag: false,
  });
});

test('an ID3v2 tag before and an ID3v1 tag after the frames are skipped', () => {
  const id3v2 = new Uint8Array(10 + 300);
  id3v2.set([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 2, 44]);
  const id3v1 = new Uint8Array(128);
  id3v1.set([0x54, 0x41, 0x47]);
  expect(scanMp3Frames(join(id3v2, frame(), frame(), id3v1)).audioFrames).toBe(2);
});

test('anything that is not a complete MPEG-1 Layer III frame fails', () => {
  expect(() => scanMp3Frames(join(frame(), new Uint8Array(5)))).toThrow(
    '5 unexpected bytes at offset 288',
  );
  expect(() => scanMp3Frames(join(frame(), frame().subarray(0, 100)))).toThrow(
    '100 unexpected bytes',
  );
  const mpeg2 = frame();
  mpeg2[1] = 0xf3;
  expect(() => scanMp3Frames(mpeg2)).toThrow('288 unexpected bytes at offset 0');
  expect(() => scanMp3Frames(new Uint8Array(0))).toThrow('no audio frames');
});
