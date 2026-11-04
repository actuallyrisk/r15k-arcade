// R15K Arcade tools – the PNG container shared by encoder and decoder: the signature and the chunk layout
// (big-endian length, four-letter type, data, CRC-32 over type and data). Not part of the tools entry.
import { crc32 } from './crc32.ts';

/** The eight bytes every PNG file starts with. */
export const PNG_SIGNATURE: Uint8Array = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);

/** One chunk of a PNG file. */
export interface PngChunk {
  readonly type: string;
  readonly data: Uint8Array;
}

/** Bytes around the data of a chunk: length (4), type (4) and CRC (4). */
const CHUNK_OVERHEAD = 12;

/** Serialises one chunk. */
export function writeChunk(type: string, data: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(CHUNK_OVERHEAD + data.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, data.length);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(data, 8);
  view.setUint32(8 + data.length, crc32(bytes.subarray(4, 8 + data.length)));
  return bytes;
}

/** Reads the chunk at `offset`; throws when it is truncated or its CRC does not match. */
function readChunk(bytes: Uint8Array, offset: number): PngChunk {
  if (offset + CHUNK_OVERHEAD > bytes.length) {
    throw new Error('PNG is truncated');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const length = view.getUint32(offset);
  const end = offset + 8 + length;
  if (end + 4 > bytes.length) {
    throw new Error('PNG is truncated');
  }
  const type = new TextDecoder('latin1').decode(bytes.subarray(offset + 4, offset + 8));
  if (crc32(bytes.subarray(offset + 4, end)) !== view.getUint32(end)) {
    throw new Error(`PNG chunk ${type} has a wrong CRC`);
  }
  return { type, data: bytes.subarray(offset + 8, end) };
}

/** Every chunk up to and including IEND; throws on a missing signature, a bad CRC or a missing IEND. */
export function readChunks(bytes: Uint8Array): readonly PngChunk[] {
  const hasSignature = PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
  if (!hasSignature) {
    throw new Error('not a PNG file (signature missing)');
  }
  const chunks: PngChunk[] = [];
  let offset = PNG_SIGNATURE.length;
  while (chunks.at(-1)?.type !== 'IEND') {
    const next = readChunk(bytes, offset);
    chunks.push(next);
    offset += CHUNK_OVERHEAD + next.data.length;
  }
  return chunks;
}

/** Concatenates byte arrays. */
export function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}
