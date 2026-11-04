import { expect, test } from 'vitest';
import { compileFont } from './font.ts';
import type { FontSource } from './font.ts';
import { validateFont } from './font-validate.ts';
import { TEST_FONT } from './test-support/test-font.ts';

/** The test font with some glyphs replaced or removed. */
function withGlyphs(glyphs: Readonly<Record<string, string>>, fallback = '?'): FontSource {
  return { ...TEST_FONT, fallback, glyphs };
}

test('a compiled glyph holds width × cellHeight bits', () => {
  const font = compileFont(TEST_FONT);
  expect(font.id).toBe('test-font');
  expect(font.metrics).toBe(TEST_FONT.metrics);
  expect(font.cellHeight).toBe(5);
  const glyph = font.glyph('A');
  expect(glyph.width).toBe(3);
  expect(Array.from(glyph.bits)).toEqual([0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0]);
});

test('the space has spaceWidth and no ink, unknown characters use the fallback', () => {
  const font = compileFont(TEST_FONT);
  const space = font.glyph(' ');
  expect(space.width).toBe(2);
  expect(Array.from(space.bits)).toEqual(new Array<number>(10).fill(0));
  expect(font.glyph('Z')).toBe(font.glyph('?'));
  expect(font.has('A')).toBe(true);
  expect(font.has(' ')).toBe(true);
  expect(font.has('Z')).toBe(false);
});

test('compileFont rejects an invalid source with its issues', () => {
  const broken = withGlyphs({ ' ': '.|.|.|.|.', '?': '#|#|#' });
  expect(() => compileFont(broken)).toThrow(
    `invalid font 'test-font':\n"?": has 3 rows, expected 5`,
  );
  expect(() => compileFont(withGlyphs({ ' ': '.|.|.|.|.' }))).toThrow('fallback glyph is missing');
});

test('a complete font has no issues', () => {
  expect(validateFont(TEST_FONT, 'AB?Äg \u{E000}')).toEqual([]);
});

test('missing required characters are reported once each', () => {
  expect(validateFont(TEST_FONT, 'AZZ\u{1F408}')).toEqual([
    { font: 'test-font', char: 'Z', message: 'required glyph is missing' },
    { font: 'test-font', char: '\u{1F408}', message: 'required glyph is missing' },
  ]);
});

test('every glyph rule reports an issue for its key', () => {
  const issues = validateFont(
    withGlyphs({
      AB: '.|#|#|#|.',
      C: '#|#|#',
      D: '##|#|##|##|##',
      E: '##########|##########|##########|##########|##########',
      F: '#x|##|##|##|##',
      '': '#|#|#|#|#',
      '\u{E001}': '############|.|.|.|.',
    }),
    '',
  );
  expect(issues.map((issue) => [issue.char, issue.message])).toEqual([
    ['AB', 'key is not exactly one code point'],
    ['C', 'has 3 rows, expected 5'],
    ['D', 'rows have different widths'],
    ['E', 'width 10 is outside 1…9'],
    ['F', "only '#' and '.' are allowed"],
    ['', 'key is not exactly one code point'],
    ['\u{E001}', 'rows have different widths'],
    ['\u{E001}', 'width 12 is outside 1…11'],
    ['?', 'fallback glyph is missing'],
    [' ', 'space glyph is missing'],
  ]);
});

test('icons may be up to 11 pixels wide', () => {
  const icon = Array.from({ length: 5 }, () => '#'.repeat(11)).join('|');
  const font = withGlyphs({ ...TEST_FONT.glyphs, '\u{E019}': icon });
  expect(validateFont(font, '\u{E019}')).toEqual([]);
  expect(compileFont(font).glyph('\u{E019}').width).toBe(11);
});
