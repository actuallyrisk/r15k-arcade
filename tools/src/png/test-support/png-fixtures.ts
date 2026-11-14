// R15K Arcade tools – PNG fixtures for the codec tests: images of known content and a reference encoder
// that applies a chosen filter type per row (the production encoder writes filter 0 only).
import { deflateSync } from 'node:zlib';
import { concatBytes, PNG_SIGNATURE, writeChunk } from '../png-chunks.ts';
import type { RgbaImage } from '../png-encode.ts';

/** A deterministic image whose bytes cover the whole 0…255 range. */
export function patternImage(width: number, height: number): RgbaImage {
  const data = new Uint8Array(width * height * 4);
  data.forEach((_value, index) => {
    data[index] = (index * 37 + (index >> 2) * 11) & 0xff;
  });
  return { width, height, data };
}

/** The Paeth predictor (reference copy for the encoder side). */
function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const distances = [estimate - left, estimate - up, estimate - upLeft].map(Math.abs);
  const [toLeft = 0, toUp = 0, toUpLeft = 0] = distances;
  if (toLeft <= toUp && toLeft <= toUpLeft) {
    return left;
  }
  return toUp <= toUpLeft ? up : upLeft;
}

/** The predicted value of a byte for one filter type. */
function predict(filterType: number, left: number, above: readonly [number, number]): number {
  const [up, upLeft] = above;
  const predictions = [0, left, up, (left + up) >>> 1, paeth(left, up, upLeft)];
  return predictions[filterType] ?? 0;
}

/** Filters one row of raw bytes with the given filter type. */
function filterRow(
  row: Uint8Array,
  previous: Uint8Array,
  options: { readonly filterType: number; readonly channels: number },
): Uint8Array {
  const out = new Uint8Array(row.length + 1);
  out[0] = options.filterType;
  row.forEach((value, x) => {
    const hasLeft = x >= options.channels;
    const left = hasLeft ? (row[x - options.channels] ?? 0) : 0;
    const upLeft = hasLeft ? (previous[x - options.channels] ?? 0) : 0;
    const above = [previous[x] ?? 0, upLeft] as const;
    out[x + 1] = (value - predict(options.filterType, left, above)) & 0xff;
  });
  return out;
}

/** What the reference encoder writes. */
export interface ReferencePngOptions {
  /** 2 = RGB (the alpha bytes of the image are dropped), 6 = RGBA. */
  readonly colorType: 2 | 6;
  /** Filter type of row y is filterTypes[y % length]. */
  readonly filterTypes: readonly number[];
  /** The compressed data is split into this many IDAT chunks. */
  readonly idatCount: number;
}

/** Raw bytes of an image without alpha when RGB is requested. */
function channelBytes(image: RgbaImage, channels: number): Uint8Array {
  if (channels === 4) {
    return image.data;
  }
  return image.data.filter((_value, index) => index % 4 !== 3);
}

/** IHDR payload for the reference encoder. */
function header(image: RgbaImage, colorType: number): Uint8Array {
  const bytes = new Uint8Array(13);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, image.width);
  view.setUint32(4, image.height);
  bytes.set([8, colorType, 0, 0, 0], 8);
  return bytes;
}

/** Encodes an image with chosen filter types, colour type and IDAT split. */
export function encodeReferencePng(image: RgbaImage, options: ReferencePngOptions): Uint8Array {
  const channels = options.colorType === 2 ? 3 : 4;
  const raw = channelBytes(image, channels);
  const stride = image.width * channels;
  const rows: Uint8Array[] = [];
  let previous: Uint8Array = new Uint8Array(stride);
  for (let y = 0; y < image.height; y += 1) {
    const row = raw.subarray(y * stride, (y + 1) * stride);
    const filterType = options.filterTypes[y % options.filterTypes.length] ?? 0;
    rows.push(filterRow(row, previous, { filterType, channels }));
    previous = row;
  }
  const compressed = deflateSync(concatBytes(rows));
  const size = Math.ceil(compressed.length / options.idatCount);
  const idat = Array.from({ length: options.idatCount }, (_unused, index) =>
    writeChunk('IDAT', compressed.subarray(index * size, (index + 1) * size)),
  );
  return concatBytes([
    PNG_SIGNATURE,
    writeChunk('IHDR', header(image, options.colorType)),
    ...idat,
    writeChunk('IEND', new Uint8Array(0)),
  ]);
}
