// R15K Arcade tools – minimal PNG decoder for pixel goldens: colour types 2 and 6, bit depth 8,
// non-interlaced, filters 0–4, several IDAT chunks, CRCs checked. Anything else throws, so a golden saved
// by another program in an unsupported format fails loudly instead of comparing wrongly.
import { inflateSync } from 'node:zlib';
import { concatBytes, readChunks } from './png-chunks.ts';
import type { PngChunk } from './png-chunks.ts';
import type { RgbaImage } from './png-encode.ts';

/** The header fields this decoder supports. */
interface PngHeader {
  readonly width: number;
  readonly height: number;
  /** Bytes per pixel: 3 (RGB, colour type 2) or 4 (RGBA, colour type 6). */
  readonly channels: 3 | 4;
}

/** Bytes 8–12 of IHDR: bit depth, colour type, compression, filter method, interlace method. */
function readChannels(fields: Uint8Array): 3 | 4 {
  const [bitDepth, colorType, compression, filter, interlace] = fields;
  const isRgb = colorType === 2 || colorType === 6;
  const isPlain = compression === 0 && filter === 0 && interlace === 0;
  if (bitDepth !== 8 || !isRgb || !isPlain) {
    throw new Error(
      `unsupported PNG format: bit depth ${String(bitDepth)}, colour type ${String(colorType)}, interlace ${String(interlace)}`,
    );
  }
  return colorType === 2 ? 3 : 4;
}

/** Reads IHDR; throws for anything but 8-bit RGB/RGBA without interlacing. */
function readHeader(chunk: PngChunk | undefined): PngHeader {
  if (chunk?.type !== 'IHDR' || chunk.data.length !== 13) {
    throw new Error('PNG does not start with an IHDR chunk');
  }
  const view = new DataView(chunk.data.buffer, chunk.data.byteOffset, chunk.data.byteLength);
  const channels = readChannels(chunk.data.subarray(8));
  return { width: view.getUint32(0), height: view.getUint32(4), channels };
}

/** The Paeth predictor of the PNG specification. */
function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toUpLeft = Math.abs(estimate - upLeft);
  if (toLeft <= toUp && toLeft <= toUpLeft) {
    return left;
  }
  return toUp <= toUpLeft ? up : upLeft;
}

/** The value a filter type adds to a filtered byte. */
function predictor(filterType: number, neighbours: readonly [number, number, number]): number {
  const [left, up, upLeft] = neighbours;
  switch (filterType) {
    case 0:
      return 0;
    case 1:
      return left;
    case 2:
      return up;
    case 3:
      return (left + up) >>> 1;
    case 4:
      return paeth(left, up, upLeft);
    default:
      throw new Error(`unknown PNG filter type ${filterType}`);
  }
}

/** A byte of an array (0 outside it). */
const byteAt = (bytes: Uint8Array, index: number): number => bytes[index] ?? 0;

/** What reversing the filter of one row needs besides the row itself. */
interface RowContext {
  readonly filterType: number;
  readonly channels: number;
  /** The already reconstructed row above (zeros for the first row). */
  readonly previous: Uint8Array;
}

/** Reconstructs one row in place of `current` from its filtered bytes. */
function unfilterRow(filtered: Uint8Array, current: Uint8Array, context: RowContext): void {
  for (let x = 0; x < current.length; x += 1) {
    const hasLeft = x >= context.channels;
    const left = hasLeft ? byteAt(current, x - context.channels) : 0;
    const upLeft = hasLeft ? byteAt(context.previous, x - context.channels) : 0;
    const neighbours = [left, byteAt(context.previous, x), upLeft] as const;
    current[x] = (byteAt(filtered, x) + predictor(context.filterType, neighbours)) & 0xff;
  }
}

/** Reverses the per-row filters; returns the raw pixel bytes (height × width × channels). */
function unfilter(inflated: Uint8Array, header: PngHeader): Uint8Array {
  const stride = header.width * header.channels;
  if (inflated.length !== (stride + 1) * header.height) {
    throw new Error('PNG image data has the wrong length');
  }
  const pixels = new Uint8Array(stride * header.height);
  let previous = new Uint8Array(stride);
  for (let y = 0; y < header.height; y += 1) {
    const start = y * (stride + 1);
    const current = pixels.subarray(y * stride, (y + 1) * stride);
    const filtered = inflated.subarray(start + 1, start + 1 + stride);
    unfilterRow(filtered, current, {
      filterType: byteAt(inflated, start),
      channels: header.channels,
      previous,
    });
    previous = current;
  }
  return pixels;
}

/** Expands RGB to RGBA (opaque); RGBA is returned unchanged. */
function toRgba(pixels: Uint8Array, header: PngHeader): Uint8Array {
  if (header.channels === 4) {
    return pixels;
  }
  const rgba = new Uint8Array(header.width * header.height * 4);
  for (let index = 0; index < header.width * header.height; index += 1) {
    rgba.set(pixels.subarray(index * 3, index * 3 + 3), index * 4);
    rgba[index * 4 + 3] = 255;
  }
  return rgba;
}

/** Decodes a PNG into an RGBA image. */
export function decodePng(bytes: Uint8Array): RgbaImage {
  const chunks = readChunks(bytes);
  const header = readHeader(chunks[0]);
  const idat = chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data);
  if (idat.length === 0) {
    throw new Error('PNG has no IDAT chunk');
  }
  const pixels = unfilter(inflateSync(concatBytes(idat)), header);
  return { width: header.width, height: header.height, data: toRgba(pixels, header) };
}
