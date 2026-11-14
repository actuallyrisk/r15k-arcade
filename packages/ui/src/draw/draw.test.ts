import { expect, test } from 'vitest';
import { SLOT } from '@r15k/engine';
import type { DrawTarget } from '@r15k/engine';
import { makeTarget } from '../test-support/frames.ts';
import { UI_THEME } from '../theme/ui-theme.ts';
import { drawFocusRing } from './focus-ring.ts';
import { drawGridPaper } from './grid-paper.ts';
import { drawLabel, labelWidth, wrapLabel } from './label.ts';
import { drawFramedField, drawPanel } from './panel.ts';

/** The slot at a pixel. */
function at(target: DrawTarget, x: number, y: number): number {
  return target.framebuffer.pixels[y * target.framebuffer.width + x] ?? -1;
}

/** Number of pixels holding a slot. */
function count(target: DrawTarget, slot: number): number {
  return target.framebuffer.pixels.filter((value) => value === slot).length;
}

test('labels are drawn and measured in upper case, ß as SS', () => {
  const style = { font: 'r15k-8', zoom: 1 } as const;
  expect(labelWidth('stumm', style)).toBe(labelWidth('STUMM', style));
  expect(labelWidth('ß', style)).toBe(labelWidth('SS', style));
  expect(labelWidth('ab', { ...style, zoom: 3 })).toBe(3 * labelWidth('AB', style));
  const lower = makeTarget();
  const upper = makeTarget();
  expect(drawLabel(lower, 'größe', { style, slot: SLOT.ink, x: 2, y: 4 })).toBe(
    drawLabel(upper, 'GRÖSSE', { style, slot: SLOT.ink, x: 2, y: 4 }),
  );
  expect(lower.framebuffer.pixels).toEqual(upper.framebuffer.pixels);
});

test('labels align and draw a hard shadow', () => {
  const style = { font: 'r15k-5', zoom: 2 } as const;
  const target = makeTarget();
  const width = drawLabel(target, 'hi', {
    style,
    slot: SLOT.ink,
    x: 100,
    y: 10,
    align: 'right',
    shadowSlot: SLOT.blue,
  });
  expect(width).toBe(labelWidth('HI', style));
  expect(count(target, SLOT.blue)).toBeGreaterThan(0);
  const centred = makeTarget();
  drawLabel(centred, 'I', { style, slot: SLOT.ink, x: 50, y: 10, align: 'center' });
  expect(at(centred, 50, 10)).toBe(SLOT.ink);
});

test('wrapLabel returns upper-cased lines within the width', () => {
  const style = { font: 'r15k-8', zoom: 1 } as const;
  const lines = wrapLabel('Fenster zu klein. Bitte vergrößern.', { style, maxWidth: 80 });
  expect(lines.length).toBeGreaterThan(1);
  expect(lines.join(' ')).toBe('FENSTER ZU KLEIN. BITTE VERGRÖSSERN.');
  for (const line of lines) {
    expect(labelWidth(line, style)).toBeLessThanOrEqual(80);
  }
});

test('a panel has a +3/+3 shadow, a 1 px ink border and a paper fill', () => {
  const target = makeTarget();
  drawPanel(target, { x: 10, y: 10, width: 20, height: 10 });
  expect(at(target, 10, 10)).toBe(SLOT.ink);
  expect(at(target, 11, 11)).toBe(SLOT.paper);
  expect(at(target, 30, 13)).toBe(SLOT.shadow);
  expect(at(target, 32, 19)).toBe(SLOT.shadow);
  expect(at(target, 30, 12)).toBe(SLOT.paper);
  expect(at(target, 13, 22)).toBe(SLOT.shadow);
});

test('panel styles override fill, border and shadow', () => {
  const target = makeTarget();
  const style = { fill: SLOT.blueTint, border: SLOT.blueInk, shadow: SLOT.pink, shadowOffset: 0 };
  drawPanel(target, { x: 10, y: 10, width: 20, height: 10 }, style);
  expect(at(target, 10, 10)).toBe(SLOT.blueInk);
  expect(at(target, 12, 12)).toBe(SLOT.blueTint);
  expect(count(target, SLOT.pink)).toBe(0);
});

test('a framed field keeps its interior and draws the outline and shadow', () => {
  const target = makeTarget();
  drawFramedField(target, { x: 10, y: 10, width: 20, height: 10 });
  expect(at(target, 10, 15)).toBe(SLOT.ink);
  expect(at(target, 15, 15)).toBe(SLOT.paper);
  expect(at(target, 31, 15)).toBe(SLOT.shadow);
});

test('grid paper draws lines where (x − origin) mod spacing = spacing − 1', () => {
  const target = makeTarget();
  drawGridPaper(target, { x: 0, y: 0, width: 64, height: 40 });
  expect(at(target, 15, 3)).toBe(UI_THEME.gridLine);
  expect(at(target, 3, 31)).toBe(UI_THEME.gridLine);
  expect(at(target, 16, 3)).toBe(UI_THEME.panelFill);
  const shifted = makeTarget();
  drawGridPaper(
    shifted,
    { x: 0, y: 0, width: 64, height: 40 },
    { spacing: 8, origin: { x: 3, y: 0 } },
  );
  expect(at(shifted, 10, 1)).toBe(UI_THEME.gridLine);
  expect(at(shifted, 2, 1)).toBe(UI_THEME.gridLine);
  expect(at(shifted, 1, 1)).toBe(UI_THEME.panelFill);
});

test('the focus ring has a gap at distance 1 and the ring at distance 2', () => {
  const target = makeTarget();
  drawPanel(target, { x: 0, y: 0, width: 200, height: 120 }, { fill: SLOT.ink, shadowOffset: 0 });
  drawFocusRing(target, { x: 20, y: 20, width: 10, height: 10 });
  expect(at(target, 19, 25)).toBe(UI_THEME.focusGap);
  expect(at(target, 18, 25)).toBe(UI_THEME.focusRing);
  expect(at(target, 31, 31)).toBe(UI_THEME.focusRing);
});
