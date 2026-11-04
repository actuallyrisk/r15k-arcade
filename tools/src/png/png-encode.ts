// R15K Arcade tools – minimal PNG encoder for pixel goldens and icons: signature, IHDR (8-bit RGBA, no
// interlace), one IDAT (filter 0 on every row, deflate level 9), IEND.
import { notImplemented } from '@r15k/engine';

/** An RGBA8 image, row-major. */
export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

/** Encodes an image as PNG. */
export function encodePng(_image: RgbaImage): Uint8Array {
  return notImplemented('tools.encodePng');
}
