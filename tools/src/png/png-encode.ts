// R15K Arcade tools – minimal PNG encoder for pixel goldens and icons: signature, IHDR (8-bit RGBA, no
// interlace), one IDAT (filter 0 on every row, deflate level 9), IEND. Goldens are compared by decoded
// pixels, never by bytes, so a different zlib build cannot change a comparison.
import { deflateSync } from 'node:zlib';
import { concatBytes, PNG_SIGNATURE, writeChunk } from './png-chunks.ts';

/** An RGBA8 image, row-major. */
export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

const BIT_DEPTH = 8;
const COLOR_TYPE_RGBA = 6;
const DEFLATE_LEVEL = 9;

/** The IHDR payload of an 8-bit RGBA image without interlacing. */
function header(image: RgbaImage): Uint8Array {
  const bytes = new Uint8Array(13);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, image.width);
  view.setUint32(4, image.height);
  bytes.set([BIT_DEPTH, COLOR_TYPE_RGBA, 0, 0, 0], 8);
  return bytes;
}

/** The image rows, each prefixed with filter type 0 (none). */
function filteredRows(image: RgbaImage): Uint8Array {
  const stride = image.width * 4;
  const rows = new Uint8Array((stride + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    rows.set(image.data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  return rows;
}

/** Throws unless the image has a positive integer size and exactly width × height × 4 bytes. */
function assertValidImage(image: RgbaImage): void {
  const isSizeValid =
    Number.isInteger(image.width) &&
    Number.isInteger(image.height) &&
    image.width > 0 &&
    image.height > 0;
  if (!isSizeValid || image.data.length !== image.width * image.height * 4) {
    throw new Error(
      `invalid RGBA image: ${image.width}×${image.height} with ${image.data.length} bytes`,
    );
  }
}

/** Encodes an image as PNG. */
export function encodePng(image: RgbaImage): Uint8Array {
  assertValidImage(image);
  const compressed = deflateSync(filteredRows(image), { level: DEFLATE_LEVEL });
  return concatBytes([
    PNG_SIGNATURE,
    writeChunk('IHDR', header(image)),
    writeChunk('IDAT', compressed),
    writeChunk('IEND', new Uint8Array(0)),
  ]);
}
