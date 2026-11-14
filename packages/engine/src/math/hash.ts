// Deterministic hashing for replays and save checksums. UTF-8 encoding, Math.imul, string escaping and
// Number→string conversion are exactly specified, so every WebView produces the same hashes.

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const UTF8 = new TextEncoder();

/** FNV-1a 32-bit hash over the UTF-8 bytes of `text`, as an unsigned 32-bit integer. */
export function fnv1a32(text: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (const byte of UTF8.encode(text)) {
    hash = Math.imul(hash ^ byte, FNV_PRIME);
  }
  return hash >>> 0;
}

/** Formats an unsigned 32-bit integer as 8 lower-case hex digits. */
export function toHex32(value: number): string {
  return (value >>> 0).toString(16).padStart(8, '0');
}

/** Hash of a value's canonical JSON: `toHex32(fnv1a32(canonicalJson(value)))`. */
export function hashCanonical(value: unknown): string {
  return toHex32(fnv1a32(canonicalJson(value)));
}

/** Orders distinct object keys by UTF-16 code units (the default sort order, stated explicitly). */
function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : 1;
}

/** Encodes booleans, finite numbers and strings; every other primitive throws. */
function encodePrimitive(value: unknown): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`canonicalJson: ${value} has no JSON form`);
    }
    // Number→string conversion already writes -0 as "0".
    return String(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  throw new TypeError(`canonicalJson: cannot encode a ${typeof value}`);
}

/** Encodes an array or an object with sorted keys; `ancestors` detects cycles. */
function encodeObject(value: object, ancestors: Set<object>): string {
  if (ancestors.has(value)) {
    throw new TypeError('canonicalJson: cyclic structure');
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      // Array.from visits holes as undefined, which encodes as null like JSON.
      return `[${Array.from(value, (item: unknown) => encodeValue(item, ancestors)).join(',')}]`;
    }
    const record = value as Readonly<Record<string, unknown>>;
    const members = Object.keys(record)
      .sort(compareCodeUnits)
      .map((key) => `${JSON.stringify(key)}:${encodeValue(record[key], ancestors)}`);
    return `{${members.join(',')}}`;
  } finally {
    ancestors.delete(value);
  }
}

/** Encodes any supported value; `undefined` and `null` both become `null`. */
function encodeValue(value: unknown, ancestors: Set<object>): string {
  if (value === undefined || value === null) {
    return 'null';
  }
  if (typeof value === 'object') {
    return encodeObject(value, ancestors);
  }
  return encodePrimitive(value);
}

/**
 * JSON with object keys sorted in code-unit order, `undefined` (also as an object member or array
 * element) as `null` and `-0` as `0`; throws on NaN, Infinity, functions, symbols, bigints and cycles.
 */
export function canonicalJson(value: unknown): string {
  return encodeValue(value, new Set<object>());
}
