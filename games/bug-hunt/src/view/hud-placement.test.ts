import { rectBottom, rectRight, rectsIntersect } from '@r15k/engine';
import type { Rect } from '@r15k/engine';
import { describe, expect, test } from 'vitest';
import { roundHudPlacement, roundPanelRect } from './hud-placement.ts';
import {
  allLayouts,
  BOOK_VIEWPORT,
  flatViewport,
  layoutOf,
  referenceLayout,
} from './test-support/round-fixtures.ts';

/** Whether `inner` lies completely inside `outer`. */
function isInside(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    rectRight(inner) <= rectRight(outer) &&
    rectBottom(inner) <= rectBottom(outer)
  );
}

describe('roundHudPlacement at every layout', () => {
  test.each(allLayouts())('$name: the pause hit rect follows the placement rule', ({ layout }) => {
    const placement = roundHudPlacement(layout);
    const hit = placement.pauseHit;
    expect(hit.width).toBeGreaterThanOrEqual(layout.minTouchTarget);
    expect(hit.height).toBeGreaterThanOrEqual(layout.minTouchTarget);
    expect(isInside(hit, layout.safe)).toBe(true);
    if (layout.hinge !== undefined) {
      expect(rectsIntersect(hit, layout.hinge)).toBe(false);
    }
    expect(isInside(placement.pause, hit)).toBe(true);
  });

  test.each(allLayouts())('$name: HUD texts and panels stay inside the safe area', ({ layout }) => {
    const placement = roundHudPlacement(layout);
    for (const rect of [placement.score, placement.time, placement.best, placement.combo]) {
      expect(isInside(rect, layout.safe)).toBe(true);
    }
    const panel = roundPanelRect(layout);
    if (panel !== undefined) {
      expect(
        isInside({ ...panel, width: panel.width + 3, height: panel.height + 3 }, layout.safe),
      ).toBe(true);
    }
    if (placement.dragHint !== undefined && layout.hinge !== undefined) {
      expect(rectsIntersect(placement.dragHint, layout.hinge)).toBe(false);
    }
  });
});

describe('roundHudPlacement per arrangement', () => {
  test('stacked: ink band with time bar, drag hint only when the bottom panel is high enough', () => {
    const phone = roundHudPlacement(referenceLayout('phone-portrait'));
    expect(phone).toMatchObject({ isOnInk: true, holdAreas: undefined });
    expect(phone.timeBar).toEqual({ x: 23, y: 51, width: 242, height: 1 });
    expect(phone.dragHint).toBeDefined();
    expect(roundHudPlacement(referenceLayout('fold-cover')).dragHint).toBeDefined();
    expect(roundHudPlacement(referenceLayout('fold-open')).dragHint).toBeUndefined();
    expect(roundHudPlacement(referenceLayout('tablet-portrait')).dragHint).toBeUndefined();
  });

  test('sides: texts on paper, the two side panels are hold areas, no band and no hint', () => {
    const layout = referenceLayout('phone-landscape');
    const placement = roundHudPlacement(layout);
    expect(placement).toMatchObject({ isOnInk: false, timeBar: undefined, dragHint: undefined });
    expect(placement.holdAreas).toEqual(layout.sidePanels);
    expect(isInside(placement.pauseHit, layout.sidePanels?.[1] ?? layout.safe)).toBe(true);
  });

  test('tabletop: drag hint in the segment panel, no hold areas', () => {
    const layout = referenceLayout('fold-tabletop');
    const placement = roundHudPlacement(layout);
    expect(placement.holdAreas).toBeUndefined();
    expect(placement.dragHint).toBeDefined();
    expect(isInside(placement.dragHint ?? layout.safe, layout.segmentPanel ?? layout.field)).toBe(
      true,
    );
    expect(isInside(placement.pauseHit, layout.segmentPanel ?? layout.field)).toBe(true);
    expect(roundHudPlacement(referenceLayout('fold-tabletop-l')).dragHint).toBeDefined();
  });
});

describe('roundHudPlacement in book posture and banded', () => {
  test('book: no drag hint, the segment panel halves are hold areas', () => {
    const layout = layoutOf(BOOK_VIEWPORT);
    expect(layout.arrangement).toBe('book');
    const placement = roundHudPlacement(layout);
    expect(placement.dragHint).toBeUndefined();
    const segment = layout.segmentPanel ?? layout.safe;
    expect(placement.holdAreas).toEqual([
      { ...segment, width: 143 },
      { ...segment, x: segment.x + 143, width: segment.width - 143 },
    ]);
  });

  test('banded: everything in the band, the hit rect hangs from its top-right corner', () => {
    const layout = layoutOf(flatViewport(260, 160));
    expect(layout.arrangement).toBe('banded');
    const placement = roundHudPlacement(layout);
    const band = layout.hudBand ?? layout.safe;
    expect(placement).toMatchObject({ dragHint: undefined, holdAreas: undefined, isOnInk: true });
    expect(rectRight(placement.pauseHit)).toBe(rectRight(band));
    expect(placement.pauseHit.y).toBe(band.y);
    expect(isInside(placement.pause, band)).toBe(true);
    expect(placement.best.x).toBeGreaterThan(placement.combo.x);
    expect(rectRight(placement.best)).toBeLessThanOrEqual(placement.pause.x);
  });
});
