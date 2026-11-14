import { expect, test } from 'vitest';
import { DEFAULT_LAYOUT_RULES, validateFont } from '@r15k/engine';
import { R15K_5 } from '../fonts/r15k-5/index.ts';
import { R15K_8 } from '../fonts/r15k-8/index.ts';
import { REQUIRED_CHARSET } from './charset.ts';
import { ICONS } from './icons.ts';
import { capHeightOf, spaceWidthOf } from './text-metrics.ts';
import { fontFor, getUiFonts, scaledChoice } from './ui-fonts.ts';

// The glyphs of the original 404 game: 5 rows each, row-major, '1' = ink.
const ARCADE: Readonly<Record<string, string>> = {
  '0': '111101101101111',
  '1': '010110010010111',
  '2': '111001111100111',
  '3': '111001011001111',
  '4': '101101111001001',
  '5': '111100111001111',
  '6': '111100111101111',
  '7': '111001001010010',
  '8': '111101111101111',
  '9': '111101111001111',
  A: '010101111101101',
  B: '110101110101110',
  C: '011100100100011',
  D: '110101101101110',
  E: '111100110100111',
  F: '111100110100100',
  G: '011100101101011',
  H: '101101111101101',
  I: '111010010010111',
  J: '001001001101010',
  K: '101101110101101',
  L: '100100100100111',
  M: '1000111011101011000110001',
  N: '10011101101110011001',
  O: '010101101101010',
  P: '110101110100100',
  Q: '010101101110011',
  R: '110101110101101',
  S: '011100010001110',
  T: '111010010010010',
  U: '101101101101111',
  V: '101101101101010',
  W: '1000110001101011101110001',
  X: '101101010101101',
  Y: '101101010010010',
  Z: '111001010100111',
  ':': '000010000010000',
  '!': '010010010000010',
  '?': '111001010000010',
  '+': '000010111010000',
  '-': '000000111000000',
  '.': '000000000000010',
  '/': '001001010100100',
};

test('the charset holds ASCII, German, typography, arrows and 26 icons', () => {
  const chars = Array.from(REQUIRED_CHARSET);
  expect(chars).toHaveLength(95 + 8 + 13 + 4 + 26);
  expect(new Set(chars).size).toBe(chars.length);
  expect(Object.values(ICONS)[0]).toBe('');
  expect(ICONS.lock).toBe('');
});

test('both fonts carry every required glyph and pass validation', () => {
  expect(validateFont(R15K_5, REQUIRED_CHARSET)).toEqual([]);
  expect(validateFont(R15K_8, REQUIRED_CHARSET)).toEqual([]);
});

test('font cap heights match the layout text rules', () => {
  const caps = new Map(
    [...DEFAULT_LAYOUT_RULES.hudCandidates, ...DEFAULT_LAYOUT_RULES.menuCandidates].map(
      (candidate) => [
        `${candidate.choice.font}×${String(candidate.choice.zoom)}`,
        candidate.capHeight,
      ],
    ),
  );
  expect(caps.get('r15k-5×1')).toBe(R15K_5.metrics.capHeight);
  expect(caps.get('r15k-8×1')).toBe(R15K_8.metrics.capHeight);
  expect(caps.get('r15k-8×2')).toBe(2 * R15K_8.metrics.capHeight);
});

test('r15k-5 digits, A–Z and : ! ? + - . / are exactly the original glyphs in rows 2–6', () => {
  for (const [char, bits] of Object.entries(ARCADE)) {
    const rows = (R15K_5.glyphs[char] ?? '').split('|');
    const width = bits.length / 5;
    const expected = Array.from({ length: 5 }, (_, row) =>
      bits
        .slice(row * width, row * width + width)
        .replaceAll('1', '#')
        .replaceAll('0', '.'),
    );
    expect(rows.slice(2, 7), char).toEqual(expected);
    expect([...rows.slice(0, 2), ...rows.slice(7)].join(''), char).not.toContain('#');
  }
});

test('typical r15k-8 widths: 5, M and W 7, I 3', () => {
  const fonts = getUiFonts();
  expect(fonts.large.glyph('A').width).toBe(5);
  expect(fonts.large.glyph('M').width).toBe(7);
  expect(fonts.large.glyph('W').width).toBe(7);
  expect(fonts.large.glyph('I').width).toBe(3);
  expect(fonts.small.glyph('N').width).toBe(4);
});

test('fonts compile once and resolve per style', () => {
  const fonts = getUiFonts();
  expect(getUiFonts()).toBe(fonts);
  expect(fontFor({ font: 'r15k-5', zoom: 1 }, fonts)).toBe(fonts.small);
  expect(fontFor({ font: 'r15k-8', zoom: 3 }, fonts)).toBe(fonts.large);
});

test('scaledChoice multiplies the zoom and caps it at 4', () => {
  expect(scaledChoice({ font: 'r15k-8', zoom: 1 }, 1)).toEqual({ font: 'r15k-8', zoom: 1 });
  expect(scaledChoice({ font: 'r15k-8', zoom: 1 }, 3)).toEqual({ font: 'r15k-8', zoom: 3 });
  expect(scaledChoice({ font: 'r15k-8', zoom: 2 }, 2)).toEqual({ font: 'r15k-8', zoom: 4 });
  expect(scaledChoice({ font: 'r15k-5', zoom: 2 }, 3).zoom).toBe(4);
  expect(scaledChoice({ font: 'r15k-5', zoom: 1 }, 2).zoom).toBe(2);
});

test('text metrics scale with the zoom', () => {
  expect(capHeightOf({ font: 'r15k-8', zoom: 2 })).toBe(16);
  expect(spaceWidthOf({ font: 'r15k-5', zoom: 3 })).toBe(9);
});
