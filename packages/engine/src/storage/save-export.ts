import { notImplemented } from '../util/assert.ts';
import type { Result } from '../util/result.ts';

/** Encodes a save document as an export file with a checksum (device change without cloud). */
export function encodeSaveExport(_document: unknown, _schemaVersion: number): string {
  return notImplemented('engine.encodeSaveExport');
}

/** Decodes an export file and verifies its format and checksum. */
export function decodeSaveExport(
  _text: string,
): Result<{ readonly schemaVersion: number; readonly document: unknown }, string> {
  return notImplemented('engine.decodeSaveExport');
}
