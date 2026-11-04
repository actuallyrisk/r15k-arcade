import { notImplemented } from '../util/assert.ts';

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
  has(char: string): boolean;
}

/** Compiles a font source; throws on an invalid source. */
export function compileFont(_source: FontSource): CompiledFont {
  return notImplemented('engine.compileFont');
}
