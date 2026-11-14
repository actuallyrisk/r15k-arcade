import type { FontSource } from './font.ts';

/** One problem found in a font source. */
export interface FontIssue {
  readonly font: string;
  /** The glyph key concerned. */
  readonly char: string;
  readonly message: string;
}

const MAX_GLYPH_WIDTH = 9;
const MAX_ICON_WIDTH = 11;
const PRIVATE_USE_FIRST = 0xe000;
const PRIVATE_USE_LAST = 0xf8ff;
const GLYPH_ROW = /^[#.]*$/;

/** Whether a key is an icon glyph (a code point of the Basic Multilingual Plane's private use area). */
function isIcon(key: string): boolean {
  const codePoint = key.codePointAt(0) ?? 0;
  return codePoint >= PRIVATE_USE_FIRST && codePoint <= PRIVATE_USE_LAST;
}

/** Problems of one glyph: key, row count, equal widths, width range, characters. */
function glyphMessages(key: string, glyph: string, cellHeight: number): string[] {
  const messages: string[] = [];
  if (Array.from(key).length !== 1) {
    messages.push('key is not exactly one code point');
  }
  const rows = glyph.split('|');
  if (rows.length !== cellHeight) {
    messages.push(`has ${rows.length} rows, expected ${cellHeight}`);
  }
  const width = rows[0]?.length ?? 0;
  if (rows.some((row) => row.length !== width)) {
    messages.push('rows have different widths');
  }
  const maxWidth = isIcon(key) ? MAX_ICON_WIDTH : MAX_GLYPH_WIDTH;
  if (width < 1 || width > maxWidth) {
    messages.push(`width ${width} is outside 1…${maxWidth}`);
  }
  if (!rows.every((row) => GLYPH_ROW.test(row))) {
    messages.push("only '#' and '.' are allowed");
  }
  return messages;
}

/** Characters that must exist but do not: the required set, the fallback and the space. */
function missingChars(source: FontSource, requiredChars: string): readonly FontIssue[] {
  const has = (char: string): boolean => Object.hasOwn(source.glyphs, char);
  const missing = [...new Set(requiredChars)].filter((char) => !has(char));
  const issues = missing.map((char) => ({
    font: source.id,
    char,
    message: 'required glyph is missing',
  }));
  if (!has(source.fallback)) {
    issues.push({ font: source.id, char: source.fallback, message: 'fallback glyph is missing' });
  }
  if (!has(' ')) {
    issues.push({ font: source.id, char: ' ', message: 'space glyph is missing' });
  }
  return issues;
}

/**
 * Checks a font: every required character present, one code point per key, `cellHeight` rows of equal
 * width (1…9, icons 1…11), only `#` and `.`, fallback and space present. Returns no issues for a
 * valid font.
 */
export function validateFont(source: FontSource, requiredChars: string): readonly FontIssue[] {
  const cellHeight = source.metrics.ascent + source.metrics.descent;
  const glyphIssues = Object.entries(source.glyphs).flatMap(([char, glyph]) =>
    glyphMessages(char, glyph, cellHeight).map((message) => ({ font: source.id, char, message })),
  );
  return [...glyphIssues, ...missingChars(source, requiredChars)];
}
