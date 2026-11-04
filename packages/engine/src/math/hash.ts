import { notImplemented } from '../util/assert.ts';

/** FNV-1a 32-bit hash over the UTF-8 bytes of `text`, as an unsigned 32-bit integer. */
export function fnv1a32(_text: string): number {
  return notImplemented('engine.fnv1a32');
}

/** Formats an unsigned 32-bit integer as 8 lower-case hex digits. */
export function toHex32(_value: number): string {
  return notImplemented('engine.toHex32');
}

/** Hash of a value's canonical JSON: `toHex32(fnv1a32(canonicalJson(value)))`. */
export function hashCanonical(_value: unknown): string {
  return notImplemented('engine.hashCanonical');
}

/**
 * JSON with object keys sorted in code-unit order, `undefined` as `null` and `-0` as `0`; throws on NaN,
 * Infinity and functions.
 */
export function canonicalJson(_value: unknown): string {
  return notImplemented('engine.canonicalJson');
}
