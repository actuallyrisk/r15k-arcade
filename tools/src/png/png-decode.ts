// R15K Arcade tools – minimal PNG decoder for pixel goldens: colour types 2 and 6, bit depth 8,
// non-interlaced, filters 0–4, several IDAT chunks, CRCs checked.
import { notImplemented } from '@r15k/engine';
import type { RgbaImage } from './png-encode.ts';

/** Decodes a PNG into an RGBA image. */
export function decodePng(_bytes: Uint8Array): RgbaImage {
  return notImplemented('tools.decodePng');
}
