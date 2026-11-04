import { canonicalJson, fnv1a32, hashCanonical, toHex32 } from '../math/hash.ts';
import { err, ok } from '../util/result.ts';
import type { Result } from '../util/result.ts';

/** Format marker of an export file. */
const EXPORT_FORMAT = 'r15k-arcade-save';

/**
 * Encodes a save document as an export file with a checksum (device change without cloud). The
 * document is written in canonical JSON, the same bytes the checksum covers: `JSON.stringify` would
 * drop members set to `undefined` that canonical JSON keeps as `null`, and the file would then fail its
 * own checksum on import.
 */
export function encodeSaveExport(document: unknown, schemaVersion: number): string {
  const body = canonicalJson(document);
  const header = JSON.stringify({
    format: EXPORT_FORMAT,
    schemaVersion,
    checksum: toHex32(fnv1a32(body)),
  });
  return `${header.slice(0, -1)},"document":${body}}`;
}

function parseJson(text: string): Result<unknown, string> {
  try {
    return ok(JSON.parse(text));
  } catch (_error: unknown) {
    return err('not a JSON file');
  }
}

/** Decodes an export file and verifies its format and checksum. */
export function decodeSaveExport(
  text: string,
): Result<{ readonly schemaVersion: number; readonly document: unknown }, string> {
  const parsed = parseJson(text);
  if (!parsed.ok) {
    return parsed;
  }
  const file = parsed.value;
  if (typeof file !== 'object' || file === null || !('document' in file)) {
    return err('not a save export');
  }
  const { format, schemaVersion, checksum, document } = file as Readonly<Record<string, unknown>>;
  if (format !== EXPORT_FORMAT) {
    return err('not a save export');
  }
  if (
    typeof schemaVersion !== 'number' ||
    !Number.isSafeInteger(schemaVersion) ||
    schemaVersion < 1
  ) {
    return err('invalid schema version');
  }
  // Parsed JSON never holds NaN, Infinity or functions, so canonical hashing cannot throw here.
  return hashCanonical(document) === checksum
    ? ok({ schemaVersion, document })
    : err('checksum mismatch');
}
