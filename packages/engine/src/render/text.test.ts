import { expect, test } from 'vitest';
import { subTarget } from './draw-target.ts';
import { compileFont } from './font.ts';
import { SLOT } from './slots.ts';
import { paperTarget, pixelRows } from './test-support/pixels.ts';
import { TEST_FONT } from './test-support/test-font.ts';
import { drawText, measureText, wrapText } from './text.ts';

const FONT = compileFont(TEST_FONT);

test('measureText adds glyph widths and the spacing between them', () => {
  expect(measureText(FONT, '')).toBe(0);
  expect(measureText(FONT, 'A')).toBe(3);
  expect(measureText(FONT, 'AB')).toBe(6);
  expect(measureText(FONT, 'A B')).toBe(9);
  expect(measureText(FONT, 'AB', 2)).toBe(12);
  expect(measureText(FONT, 'ÄB')).toBe(6);
  expect(measureText(FONT, 'Z')).toBe(2);
  expect(measureText(FONT, '\u{1F408}A')).toBe(6);
});

test('drawText puts the cap line at y, with diacritics above it', () => {
  const target = paperTarget(8, 5);
  expect(drawText(target, 'AÄ', { font: FONT, slot: SLOT.ink, x: 0, y: 1 })).toBe(7);
  expect(pixelRows(target)).toEqual(['....#.#.', '.#...#..', '#.#.#.#.', '###.###.', '........']);
});

test('drawText aligns relative to x', () => {
  const centred = paperTarget(8, 4);
  drawText(centred, 'BI', { font: FONT, slot: SLOT.ink, x: 4, y: 1, align: 'center' });
  expect(pixelRows(centred)[1]).toBe('..##.#..');
  const right = paperTarget(8, 4);
  drawText(right, 'BI', { font: FONT, slot: SLOT.ink, x: 8, y: 1, align: 'right' });
  expect(pixelRows(right)[1]).toBe('....##.#');
});

test('zoom multiplies every pixel and the shadow defaults to max(1, zoom >> 1)', () => {
  const target = paperTarget(4, 9);
  const options = {
    font: FONT,
    slot: SLOT.ink,
    x: 0,
    y: 2,
    zoom: 2,
    shadowSlot: SLOT.blue,
  } as const;
  expect(drawText(target, 'I', options)).toBe(2);
  expect(pixelRows(target)).toEqual([
    '....',
    '....',
    '##..',
    '##3.',
    '##3.',
    '##3.',
    '##3.',
    '##3.',
    '.33.',
  ]);
});

test('an explicit shadow offset and sub-target origins apply', () => {
  const target = paperTarget(6, 6);
  const panel = subTarget(target, { x: 2, y: 1, width: 4, height: 5 });
  const options = {
    font: FONT,
    slot: SLOT.ink,
    x: 0,
    y: 1,
    shadowSlot: SLOT.gold,
    shadowOffset: 2,
  };
  drawText(panel, 'I', options);
  expect(pixelRows(target)).toEqual(['......', '......', '..#...', '..#...', '..#.9.', '....9.']);
});

test('wrapText breaks at spaces and drops the spaces at a break', () => {
  expect(wrapText(FONT, 'AB AB AB', { maxWidth: 16 })).toEqual(['AB AB', 'AB']);
  expect(wrapText(FONT, 'AB AB AB', { maxWidth: 15 })).toEqual(['AB', 'AB', 'AB']);
  expect(wrapText(FONT, 'AB   AB', { maxWidth: 6 })).toEqual(['AB', 'AB']);
  expect(wrapText(FONT, ' AB ', { maxWidth: 50 })).toEqual(['AB']);
  expect(wrapText(FONT, 'AB AB', { maxWidth: 31, zoom: 2 })).toEqual(['AB', 'AB']);
  expect(wrapText(FONT, 'ÄB ÄB', { maxWidth: 15 })).toEqual(['ÄB', 'ÄB']);
});

test('wrapText breaks after a hyphen that follows a letter', () => {
  expect(wrapText(FONT, 'AB-AB', { maxWidth: 12 })).toEqual(['AB-', 'AB']);
  expect(wrapText(FONT, 'AB-AB', { maxWidth: 16 })).toEqual(['AB-AB']);
  expect(wrapText(FONT, 'A -A', { maxWidth: 10 })).toEqual(['A', '-A']);
  expect(wrapText(FONT, 'A--B', { maxWidth: 11 })).toEqual(['A--', 'B']);
});

test('wrapText breaks words that are too wide by code point', () => {
  expect(wrapText(FONT, 'AAAA', { maxWidth: 8 })).toEqual(['AA', 'AA']);
  expect(wrapText(FONT, 'AB AAAA B', { maxWidth: 8 })).toEqual(['AB', 'AA', 'AA', 'B']);
  expect(wrapText(FONT, 'A', { maxWidth: 1 })).toEqual(['A']);
});

test('wrapText keeps forced and empty lines', () => {
  expect(wrapText(FONT, 'AB\n\nAB', { maxWidth: 50 })).toEqual(['AB', '', 'AB']);
  expect(wrapText(FONT, '', { maxWidth: 50 })).toEqual(['']);
});
