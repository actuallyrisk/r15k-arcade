import type { DrawTarget } from './draw-target.ts';
import type { CompiledFont, CompiledGlyph } from './font.ts';
import { fillPixelRect } from './raster.ts';
import type { SlotIndex } from './slots.ts';

/** Integer pixel multiplication of text (still pixel-exact). */
export type TextZoom = 1 | 2 | 3 | 4;

/** How a string is drawn. */
export interface DrawTextOptions {
  readonly font: CompiledFont;
  readonly slot: SlotIndex;
  readonly x: number;
  /** Cap line (top of capital letters). */
  readonly y: number;
  readonly zoom?: TextZoom;
  /** Relative to x. */
  readonly align?: 'left' | 'center' | 'right';
  /** Hard shadow drawn first. */
  readonly shadowSlot?: SlotIndex;
  /** Default max(1, zoom >> 1), both axes. */
  readonly shadowOffset?: number;
}

/** One pass of glyphs at a pen position in framebuffer pixels (the top of the glyph cells). */
interface TextRun {
  readonly font: CompiledFont;
  readonly slot: SlotIndex;
  readonly x: number;
  readonly y: number;
  readonly zoom: TextZoom;
}

/** Whether a line fits the wrap width. */
type Fits = (line: string) => boolean;

/** A word piece (a possible line start) or a run of spaces between pieces. */
interface Token {
  readonly text: string;
  readonly isSpace: boolean;
}

/** Draws the ink bits of one glyph as zoom × zoom blocks. */
function drawGlyph(target: DrawTarget, glyph: CompiledGlyph, run: TextRun): void {
  glyph.bits.forEach((bit, index) => {
    if (bit === 1) {
      const column = index % glyph.width;
      const row = Math.floor(index / glyph.width);
      const block = {
        x: run.x + column * run.zoom,
        y: run.y + row * run.zoom,
        width: run.zoom,
        height: run.zoom,
      };
      fillPixelRect(target, block, run.slot);
    }
  });
}

/** Draws every glyph of `text` from the run's pen position. */
function drawRun(target: DrawTarget, text: string, run: TextRun): void {
  const spacing = run.font.metrics.letterSpacing;
  let x = run.x;
  for (const char of text) {
    const glyph = run.font.glyph(char);
    drawGlyph(target, glyph, { ...run, x });
    x += (glyph.width + spacing) * run.zoom;
  }
}

/** Left edge of a string of `width` pixels aligned at `x`. */
function alignedLeft(x: number, width: number, align: DrawTextOptions['align']): number {
  if (align === 'center') {
    return x - Math.floor(width / 2);
  }
  return align === 'right' ? x - width : x;
}

/**
 * Draws a string and returns its width. `y` is the cap line: the glyph cells start
 * `(ascent − capHeight) × zoom` pixels above it, where the diacritic rows sit. A shadow, when asked for,
 * is the same string drawn first, offset right and down.
 */
export function drawText(target: DrawTarget, text: string, options: DrawTextOptions): number {
  const { font, slot } = options;
  const zoom = options.zoom ?? 1;
  const width = measureText(font, text, zoom);
  const x = Math.floor(target.origin.x + alignedLeft(options.x, width, options.align));
  const capOffset = (font.metrics.ascent - font.metrics.capHeight) * zoom;
  const y = Math.floor(target.origin.y + options.y) - capOffset;
  if (options.shadowSlot !== undefined) {
    const offset = options.shadowOffset ?? Math.max(1, zoom >> 1);
    drawRun(target, text, { font, slot: options.shadowSlot, x: x + offset, y: y + offset, zoom });
  }
  drawRun(target, text, { font, slot, x, y, zoom });
  return width;
}

/**
 * Width of a string: Σ(glyph width + letterSpacing) − letterSpacing, times zoom; '' is 0; iterates code
 * points (unknown characters count as the fallback glyph).
 */
export function measureText(font: CompiledFont, text: string, zoom: TextZoom = 1): number {
  const spacing = font.metrics.letterSpacing;
  let width = 0;
  let count = 0;
  for (const char of text) {
    width += font.glyph(char).width + spacing;
    count += 1;
  }
  return count === 0 ? 0 : (width - spacing) * zoom;
}

/** Splits a paragraph into word pieces and space runs; a piece ends after a '-' that follows a letter. */
function tokenize(paragraph: string): Token[] {
  const chars = Array.from(paragraph);
  const tokens: Token[] = [];
  let current = '';
  chars.forEach((char, index) => {
    const isSpace = char === ' ';
    if (current !== '' && isSpace !== current.startsWith(' ')) {
      tokens.push({ text: current, isSpace: !isSpace });
      current = '';
    }
    current += char;
    const isBreakAfter = char === '-' && /[^ -]/.test(current) && chars[index + 1] !== '-';
    if (isBreakAfter) {
      tokens.push({ text: current, isSpace: false });
      current = '';
    }
  });
  return current === '' ? tokens : [...tokens, { text: current, isSpace: current.startsWith(' ') }];
}

/** Breaks a word that is too wide into pieces of at least one code point each. */
function breakWord(word: string, fits: Fits): string[] {
  const pieces: string[] = [];
  let piece = '';
  for (const char of word) {
    if (piece !== '' && !fits(piece + char)) {
      pieces.push(piece);
      piece = '';
    }
    piece += char;
  }
  return [...pieces, piece];
}

/** Greedy wrap of one paragraph; spaces at a break are dropped, an empty paragraph is one empty line. */
function wrapParagraph(paragraph: string, fits: Fits): string[] {
  const lines: string[] = [];
  let line = '';
  let gap = '';
  for (const token of tokenize(paragraph)) {
    if (token.isSpace) {
      gap = line === '' ? '' : token.text;
      continue;
    }
    const candidate = line + gap + token.text;
    gap = '';
    if (fits(candidate)) {
      line = candidate;
      continue;
    }
    if (line !== '') {
      lines.push(line);
    }
    const pieces = breakWord(token.text, fits);
    line = pieces.pop() ?? '';
    lines.push(...pieces);
  }
  return [...lines, line];
}

/**
 * Greedy word wrap at spaces and after '-'; words wider than maxWidth are broken by code point, '\n'
 * forces a break. Returns at least one line ('' gives ['']).
 */
export function wrapText(
  font: CompiledFont,
  text: string,
  options: { readonly maxWidth: number; readonly zoom?: TextZoom },
): readonly string[] {
  const zoom = options.zoom ?? 1;
  const fits: Fits = (line) => measureText(font, line, zoom) <= options.maxWidth;
  return text.split('\n').flatMap((paragraph) => wrapParagraph(paragraph, fits));
}
