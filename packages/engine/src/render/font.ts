import { invariant } from '../util/assert.ts';
import { validateFont } from './font-validate.ts';

/** Vertical metrics and spacing of a bitmap font. */
export interface FontMetrics {
  /** r15k-5: 5, r15k-8: 8. */
  readonly capHeight: number;
  /** Rows above the baseline including diacritic rows (r15k-5: 7, r15k-8: 10). */
  readonly ascent: number;
  /** Rows below the baseline (r15k-5: 2, r15k-8: 3). */
  readonly descent: number;
  /** r15k-5: 10, r15k-8: 14. */
  readonly lineHeight: number;
  /** Pixels between two glyphs, added by the renderer (never part of a bitmap). */
  readonly letterSpacing: number;
  /** r15k-5: 3, r15k-8: 4. */
  readonly spaceWidth: number;
}

/** A bitmap font as text: every glyph is `ascent + descent` rows of `#`/`.` separated by `|`. */
export interface FontSource {
  /** 'r15k-5' | 'r15k-8'. */
  readonly id: string;
  readonly metrics: FontMetrics;
  /** Character drawn for unknown characters ('?'). */
  readonly fallback: string;
  /** Key = one Unicode code point. */
  readonly glyphs: Readonly<Record<string, string>>;
}

/** A compiled glyph: `width × cellHeight` bits, 1 = ink. */
export interface CompiledGlyph {
  readonly width: number;
  readonly bits: Uint8Array;
}

/** A compiled font. */
export interface CompiledFont {
  readonly id: string;
  readonly metrics: FontMetrics;
  /** ascent + descent. */
  readonly cellHeight: number;
  /** The fallback glyph for unknown characters (space has width spaceWidth and no bits). */
  glyph(char: string): CompiledGlyph;
  /** Whether the font defines `char` (unknown characters are drawn as the fallback). */
  has(char: string): boolean;
}

const INK = '#';

/** Parses one validated glyph: rows separated by '|', '#' = ink. */
function compileGlyph(glyph: string): CompiledGlyph {
  const rows = glyph.split('|');
  const width = rows[0]?.length ?? 0;
  const chars = Array.from(rows.join(''));
  return { width, bits: Uint8Array.from(chars, (char) => (char === INK ? 1 : 0)) };
}

/** Throws with every issue of an invalid source. */
function assertValid(source: FontSource): void {
  const issues = validateFont(source, '');
  if (issues.length > 0) {
    const lines = issues.map((issue) => `${JSON.stringify(issue.char)}: ${issue.message}`);
    throw new Error(`invalid font '${source.id}':\n${lines.join('\n')}`);
  }
}

/**
 * Compiles a font source; throws on an invalid source (the structural checks of validateFont,
 * without a required character set). The space glyph always has `spaceWidth` and no ink.
 */
export function compileFont(source: FontSource): CompiledFont {
  assertValid(source);
  const { metrics } = source;
  const cellHeight = metrics.ascent + metrics.descent;
  const glyphs = new Map<string, CompiledGlyph>(
    Object.entries(source.glyphs).map(([char, glyph]) => [char, compileGlyph(glyph)]),
  );
  glyphs.set(' ', {
    width: metrics.spaceWidth,
    bits: new Uint8Array(metrics.spaceWidth * cellHeight),
  });
  const fallback = glyphs.get(source.fallback);
  invariant(fallback !== undefined, `font '${source.id}' has no fallback glyph`);
  return {
    id: source.id,
    metrics,
    cellHeight,
    glyph: (char) => glyphs.get(char) ?? fallback,
    has: (char) => glyphs.has(char),
  };
}
