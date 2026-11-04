import { notImplemented } from '../util/assert.ts';
import type { FontSource } from './font.ts';

/** One problem found in a font source. */
export interface FontIssue {
  readonly font: string;
  readonly char: string;
  readonly message: string;
}

/**
 * Checks a font: every required character present, one code point per key, `cellHeight` rows of equal
 * width (1…9, icons 1…11), only `#` and `.`, fallback and space present.
 */
export function validateFont(_source: FontSource, _requiredChars: string): readonly FontIssue[] {
  return notImplemented('engine.validateFont');
}
