import { expect, test } from 'vitest';
import { computeLayout } from './compute-layout.ts';
import { contentRegions } from './content-regions.ts';
import { cssToLogical, logicalToCss } from './coordinates.ts';
import type { LayoutResult } from './layout-types.ts';
import { REFERENCE_VIEWPORTS, referenceSnapshot } from './reference-viewports.ts';
import type { ReferenceViewportId } from './reference-viewports.ts';
import { postureFromSegments } from './segments.ts';

const PLAYFIELD = { width: 240, minHeight: 120, maxHeight: 480 } as const;

const layoutAt = (id: ReferenceViewportId): LayoutResult =>
  computeLayout(referenceSnapshot(id), PLAYFIELD);

const upper = { x: 0, y: 0, width: 100, height: 50 };
const lower = { x: 0, y: 50, width: 100, height: 50 };
const right = { x: 100, y: 0, width: 100, height: 100 };

test('postureFromSegments: stacked segments are tabletop (upper first), touching ones included', () => {
  expect(postureFromSegments([lower, upper])).toEqual({
    posture: 'tabletop',
    segments: [upper, lower],
  });
});

test('postureFromSegments: side-by-side segments are book (left first)', () => {
  const left = { x: 0, y: 0, width: 100, height: 100 };
  expect(postureFromSegments([right, left])).toEqual({
    posture: 'book',
    segments: [left, right],
  });
});

test('postureFromSegments: one, three or overlapping segments are flat', () => {
  const flat = { posture: 'flat', segments: [] };
  expect(postureFromSegments([])).toEqual(flat);
  expect(postureFromSegments([upper])).toEqual(flat);
  expect(postureFromSegments([upper, lower, right])).toEqual(flat);
  expect(postureFromSegments([upper, { ...upper, x: 10, y: 10 }])).toEqual(flat);
});

test('reference viewports: device size is round(css × dpr) and posture comes from the segments', () => {
  expect(referenceSnapshot('fold-cover')).toMatchObject({ deviceWidth: 903, deviceHeight: 2315 });
  expect(referenceSnapshot('fold-tabletop').posture.posture).toBe('tabletop');
  expect(referenceSnapshot('fold-tabletop-l').posture.posture).toBe('tabletop');
  expect(referenceSnapshot('desktop').posture).toEqual({ posture: 'flat', segments: [] });
});

test('reference viewports: ids are unique and unknown ids throw', () => {
  const ids = REFERENCE_VIEWPORTS.map((viewport) => viewport.id);
  expect(new Set(ids).size).toBe(ids.length);
  // @ts-expect-error -- an id outside the union, as it could come from a test parameter
  expect(() => referenceSnapshot('watch')).toThrow(/Unknown reference viewport/);
});

test('contentRegions: flat layouts use the safe rect for both regions', () => {
  const layout = layoutAt('phone-portrait');
  expect(contentRegions(layout)).toEqual({
    display: layout.safe,
    interaction: layout.safe,
    isSplit: false,
  });
});

test('contentRegions: tabletop splits into the upper and the lower segment', () => {
  const layout = layoutAt('fold-tabletop');
  if (layout.kind !== 'ok' || layout.fieldSegment === undefined) {
    throw new Error('expected a tabletop layout');
  }
  expect(contentRegions(layout)).toEqual({
    display: layout.fieldSegment,
    interaction: layout.segmentPanel,
    isSplit: true,
  });
});

test('contentRegions: a too-small layout uses its safe rect', () => {
  const tooSmall = computeLayout(
    { ...referenceSnapshot('desktop'), deviceWidth: 200, deviceHeight: 100 },
    PLAYFIELD,
  );
  expect(tooSmall.kind).toBe('too-small');
  expect(contentRegions(tooSmall).display).toEqual(tooSmall.safe);
});

test('coordinates: CSS points map to floored logical pixels; outside the canvas is undefined', () => {
  const layout = layoutAt('phone-portrait');
  const { canvasCss, cssPerLogical } = layout;
  expect(cssToLogical(layout, { x: canvasCss.x, y: canvasCss.y })).toEqual({ x: 0, y: 0 });
  const inside = { x: canvasCss.x + 10.5 * cssPerLogical, y: canvasCss.y + 3 * cssPerLogical };
  expect(cssToLogical(layout, inside)).toEqual({ x: 10, y: 3 });
  expect(cssToLogical(layout, { x: canvasCss.x - 0.5, y: 10 })).toBeUndefined();
  expect(cssToLogical(layout, { x: 10, y: canvasCss.y + canvasCss.height })).toBeUndefined();
});

test('coordinates: logical rects round-trip through CSS on every reference viewport', () => {
  for (const reference of REFERENCE_VIEWPORTS) {
    const layout = layoutAt(reference.id);
    const rect = { x: 17, y: 9, width: 30, height: 12 };
    const css = logicalToCss(layout, rect);
    expect(css.width).toBeCloseTo(30 * layout.cssPerLogical, 9);
    expect(cssToLogical(layout, { x: css.x, y: css.y })).toEqual({ x: 17, y: 9 });
    const lastPixel = { x: css.x + css.width - 0.01, y: css.y + css.height - 0.01 };
    expect(cssToLogical(layout, lastPixel)).toEqual({ x: 46, y: 20 });
  }
});
