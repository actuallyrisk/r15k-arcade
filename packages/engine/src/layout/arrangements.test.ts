import { expect, test } from 'vitest';
import { rectBottom, rectRight, rectsIntersect } from '../math/geometry.ts';
import type { Rect } from '../math/geometry.ts';
import { computeLayout } from './compute-layout.ts';
import { DEFAULT_LAYOUT_RULES } from './layout-rules.ts';
import type { Layout, LayoutResult, ViewportSnapshot } from './layout-types.ts';
import { REFERENCE_VIEWPORTS, referenceSnapshot } from './reference-viewports.ts';

const PLAYFIELD = { width: 240, minHeight: 120, maxHeight: 480 } as const;
const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

/** A viewport snapshot with integer device sizes. */
function viewport(
  css: readonly [number, number],
  dpr: number,
  extra: Partial<ViewportSnapshot> = {},
): ViewportSnapshot {
  return {
    cssWidth: css[0],
    cssHeight: css[1],
    devicePixelRatio: dpr,
    deviceWidth: Math.round(css[0] * dpr),
    deviceHeight: Math.round(css[1] * dpr),
    safeArea: NO_INSETS,
    posture: { posture: 'flat', segments: [] },
    ...extra,
  };
}

function expectOk(result: LayoutResult): Layout {
  if (result.kind !== 'ok') {
    throw new Error('expected a fitting layout');
  }
  return result;
}

const isInside = (inner: Rect, outer: Rect): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  rectRight(inner) <= rectRight(outer) &&
  rectBottom(inner) <= rectBottom(outer);

test('folds: a fold on a pixel boundary with mask length 0 still yields a hinge of 2 × guard', () => {
  const segments = [
    { x: 0, y: 0, width: 600, height: 480 },
    { x: 0, y: 480, width: 600, height: 480 },
  ];
  const layout = expectOk(
    computeLayout(
      viewport([600, 960], 2, { posture: { posture: 'tabletop', segments } }),
      PLAYFIELD,
    ),
  );
  expect(layout.arrangement).toBe('tabletop');
  expect(layout.scale).toBe(4);
  const guard = Math.ceil((8 * 2) / 4);
  expect(layout.hinge).toEqual({ x: 0, y: 240 - guard, width: 300, height: 2 * guard });
});

test('folds: segments are sorted, so their order in the snapshot does not matter', () => {
  const snapshot = referenceSnapshot('fold-tabletop');
  const reversed = {
    ...snapshot,
    posture: { ...snapshot.posture, segments: [...snapshot.posture.segments].reverse() },
  };
  expect(computeLayout(reversed, PLAYFIELD)).toEqual(computeLayout(snapshot, PLAYFIELD));
});

test('folds: the wider book segment holds the field, here the right one', () => {
  const segments = [
    { x: 0, y: 0, width: 300, height: 841 },
    { x: 301, y: 0, width: 372, height: 841 },
  ];
  const layout = expectOk(
    computeLayout(
      viewport([673, 841], 2.625, { posture: { posture: 'book', segments } }),
      PLAYFIELD,
    ),
  );
  expect(layout.arrangement).toBe('book');
  const { fieldSegment, segmentPanel, hinge } = layout;
  expect(fieldSegment?.x).toBeGreaterThan(segmentPanel?.x ?? Infinity);
  expect(
    hinge === undefined || fieldSegment === undefined || rectsIntersect(hinge, fieldSegment),
  ).toBe(false);
});

test('folds: a fold too cramped for the field falls back to the flat chain', () => {
  const segments = [
    { x: 0, y: 0, width: 673, height: 40 },
    { x: 0, y: 41, width: 673, height: 800 },
  ];
  const layout = expectOk(
    computeLayout(
      viewport([673, 841], 2.625, { posture: { posture: 'tabletop', segments } }),
      PLAYFIELD,
    ),
  );
  expect(layout.posture).toBe('tabletop');
  expect(layout.arrangement).toBe('stacked');
  expect(layout.hinge).toBeUndefined();
});

test('folds: nothing interactive lies in the hinge on the folded references', () => {
  for (const id of ['fold-tabletop', 'fold-tabletop-l'] as const) {
    const layout = expectOk(computeLayout(referenceSnapshot(id), PLAYFIELD));
    const { hinge, field, frame, hudBand, segmentPanel } = layout;
    if (hinge === undefined || hudBand === undefined || segmentPanel === undefined) {
      throw new Error(`${id} has no hinge`);
    }
    for (const rect of [field, frame, hudBand, segmentPanel]) {
      expect(rectsIntersect(rect, hinge)).toBe(false);
      expect(isInside(rect, layout.safe)).toBe(true);
    }
  }
});

test('fallbacks and limits: landscape too narrow for side panels uses the banded arrangement', () => {
  const layout = expectOk(computeLayout(viewport([300, 200], 1), PLAYFIELD));
  expect(layout).toMatchObject({ arrangement: 'banded', scale: 1, orientation: 'landscape' });
  expect(layout.field.height).toBe(200 - 14 - 9);
});

test('fallbacks and limits: portrait too short for the bottom panel uses the banded arrangement', () => {
  const tall = expectOk(computeLayout(viewport([260, 300], 1), PLAYFIELD));
  expect(tall).toMatchObject({ arrangement: 'stacked', orientation: 'portrait' });
  const safeArea = { ...NO_INSETS, top: 120 };
  const short = expectOk(computeLayout(viewport([260, 300], 1, { safeArea }), PLAYFIELD));
  expect(short).toMatchObject({ arrangement: 'banded', orientation: 'portrait' });
  expect(short.bottomPanel).toBeUndefined();
  expect(short.hudBand?.y).toBeGreaterThanOrEqual(120);
});

test('fallbacks and limits: too small even at scale 1: a scale-1 placement', () => {
  const result = computeLayout(viewport([200, 150], 1), PLAYFIELD);
  expect(result.kind).toBe('too-small');
  expect(result).toMatchObject({
    scale: 1,
    logical: { width: 200, height: 150 },
    sizeClass: 'compact',
  });
  expect(computeLayout(viewport([0, 0], 1), PLAYFIELD).kind).toBe('too-small');
});

test('fallbacks and limits: text that no candidate makes readable still lays out, flagged unreadable', () => {
  const layout = expectOk(computeLayout(viewport([100, 200], 3), PLAYFIELD));
  expect(layout.scale).toBe(1);
  expect(layout.hudText).toEqual({ font: 'r15k-8', zoom: 2 });
  expect(layout.isTextReadable).toBe(false);
});

test('fallbacks and limits: a safe inset smaller than the canvas margin costs no logical pixel', () => {
  const plain = expectOk(computeLayout(referenceSnapshot('fold-open'), PLAYFIELD));
  const inset = expectOk(
    computeLayout(
      { ...referenceSnapshot('fold-open'), safeArea: { ...NO_INSETS, left: 0.25 } },
      PLAYFIELD,
    ),
  );
  expect(plain.canvasOffsetDevice.x).toBe(1);
  expect(inset.safe.x).toBe(0);
});

test('fallbacks and limits: device-unit rounding ignores floating-point noise', () => {
  // 50 CSS px at DPR 1.1 are 55 device px, but the float product is 55.00000000000001.
  expect(50 * 1.1).not.toBe(55);
  const safeArea = { ...NO_INSETS, top: 50 };
  const layout = expectOk(computeLayout(viewport([400, 300], 1.1, { safeArea }), PLAYFIELD));
  expect(layout.scale).toBe(1);
  expect(layout.safe).toEqual({ x: 0, y: 55, width: 440, height: 275 });
  expect(expectOk(computeLayout(referenceSnapshot('fold-cover'), PLAYFIELD)).minTouchTarget).toBe(
    42,
  );
});

test('fallbacks and limits: rules without text candidates are rejected', () => {
  const rules = { ...DEFAULT_LAYOUT_RULES, hudCandidates: [] };
  expect(() => computeLayout(referenceSnapshot('desktop'), PLAYFIELD, rules)).toThrow(
    /text candidate/,
  );
});

test('reference viewports: every reference viewport fits with readable text', () => {
  for (const reference of REFERENCE_VIEWPORTS) {
    const layout = expectOk(computeLayout(referenceSnapshot(reference.id), PLAYFIELD));
    expect(layout.isTextReadable).toBe(true);
    expect(isInside(layout.frame, layout.safe)).toBe(true);
  }
});
