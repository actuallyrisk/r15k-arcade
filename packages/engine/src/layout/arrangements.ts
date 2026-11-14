// Fit tests and geometry of the five arrangements for one scale. The framed box around a field of
// height h is gutter + outline + field + outline + hard shadow (right and bottom) + gutter, i.e.
// W + 9 by h + 9 logical px with the default gutter of 2.
import { intersectRects, rectBottom, rectRight } from '../math/geometry.ts';
import type { Point, Rect } from '../math/geometry.ts';
import { clamp } from '../math/scalar.ts';
import { ceilSafe, floorSafe } from './device-math.ts';
import type { LayoutRules } from './layout-rules.ts';
import type { Arrangement, PlayfieldSpec } from './layout-types.ts';
import type { ScaleContext } from './scale-context.ts';

/** Width of the playfield outline on each side. */
const OUTLINE = 1;
/** Offset of the hard shadow to the right of and below the frame. */
const SHADOW = 3;

/** The rectangles an arrangement places (every key present, unused ones undefined). */
export interface ArrangementGeometry {
  readonly field: Rect;
  readonly frame: Rect;
  readonly hudBand: Rect | undefined;
  readonly sidePanels: readonly [Rect, Rect] | undefined;
  readonly bottomPanel: Rect | undefined;
  readonly fieldSegment: Rect | undefined;
  readonly segmentPanel: Rect | undefined;
  readonly hinge: Rect | undefined;
}

/** What every fit test needs. */
export interface FitInput {
  readonly spec: PlayfieldSpec;
  readonly rules: LayoutRules;
  readonly context: ScaleContext;
  /** The two display segments in CSS px, upper/left first (empty when flat). */
  readonly segments: readonly Rect[];
}

const NO_PANELS = {
  hudBand: undefined,
  sidePanels: undefined,
  bottomPanel: undefined,
  fieldSegment: undefined,
  segmentPanel: undefined,
  hinge: undefined,
} as const;

/** Extra width and height of the framed box over the field. */
function boxExtra(rules: LayoutRules): number {
  return 2 * rules.gutter + 2 * OUTLINE + SHADOW;
}

/** Width of the framed box around the playfield (gutter, outline, field, outline, shadow, gutter). */
export function framedBoxWidth(spec: PlayfieldSpec, rules: LayoutRules): number {
  return spec.width + boxExtra(rules);
}

/** Field height for the vertical space left over, clamped to the playfield limits. */
function fieldHeight(available: number, spec: PlayfieldSpec): number {
  return clamp(available, spec.minHeight, spec.maxHeight);
}

/** Frame and field of the box at `box.x` whose frame starts at `box.y`. */
function frameAndField(input: FitInput, box: Point, height: number): ArrangementGeometry {
  const frame = {
    x: box.x + input.rules.gutter,
    y: box.y,
    width: input.spec.width + 2 * OUTLINE,
    height: height + 2 * OUTLINE,
  };
  const field = { x: frame.x + OUTLINE, y: frame.y + OUTLINE, width: input.spec.width, height };
  return { ...NO_PANELS, frame, field };
}

/** HUD band at the top of the block at `block`, the frame directly below it. */
function withBand(input: FitInput, block: Point, height: number): ArrangementGeometry {
  const { gutter } = input.rules;
  const band = input.context.hud.candidate.bandHeight;
  const hudBand = {
    x: block.x + gutter,
    y: block.y + gutter,
    width: input.spec.width + 2 * OUTLINE,
    height: band,
  };
  return { ...frameAndField(input, { x: block.x, y: hudBand.y + band }, height), hudBand };
}

/** Landscape: the framed box centred in the safe rect, side panels left and right of it. */
function fitSides(input: FitInput): ArrangementGeometry | undefined {
  const { safe } = input.context.placement;
  const extra = boxExtra(input.rules);
  const boxWidth = input.spec.width + extra;
  const isFitting =
    safe.width >= boxWidth + 2 * input.rules.sidePanelMinWidth &&
    safe.height >= input.spec.minHeight + extra;
  if (!isFitting) {
    return undefined;
  }
  const height = fieldHeight(safe.height - extra, input.spec);
  const boxX = safe.x + Math.floor((safe.width - boxWidth) / 2);
  const boxY = safe.y + Math.floor((safe.height - (height + extra)) / 2);
  const geometry = frameAndField(input, { x: boxX, y: boxY + input.rules.gutter }, height);
  const left = { x: safe.x, y: safe.y, width: boxX - safe.x, height: safe.height };
  const rightX = boxX + boxWidth;
  const right = { x: rightX, y: safe.y, width: rectRight(safe) - rightX, height: safe.height };
  return { ...geometry, sidePanels: [left, right] };
}

/** HUD band directly above the frame; the block (band + box) is centred in `area`. */
function fitBanded(area: Rect, input: FitInput): ArrangementGeometry | undefined {
  const extra = boxExtra(input.rules);
  const band = input.context.hud.candidate.bandHeight;
  const boxWidth = input.spec.width + extra;
  if (area.width < boxWidth || area.height < band + input.spec.minHeight + extra) {
    return undefined;
  }
  const height = fieldHeight(area.height - band - extra, input.spec);
  const block = {
    x: area.x + Math.floor((area.width - boxWidth) / 2),
    y: area.y + Math.floor((area.height - (band + height + extra)) / 2),
  };
  return withBand(input, block, height);
}

/** Portrait: HUD band at the top of the safe rect, frame below it, a bottom panel with the rest. */
function fitStacked(input: FitInput): ArrangementGeometry | undefined {
  const { safe, minTouchTarget } = input.context.placement;
  const { gutter } = input.rules;
  const extra = boxExtra(input.rules);
  const band = input.context.hud.candidate.bandHeight;
  const bottomMin = minTouchTarget + 2 * gutter;
  const boxWidth = input.spec.width + extra;
  if (safe.width < boxWidth || safe.height < band + input.spec.minHeight + extra + bottomMin) {
    return undefined;
  }
  const height = fieldHeight(safe.height - band - extra - bottomMin, input.spec);
  const block = { x: safe.x + Math.floor((safe.width - boxWidth) / 2), y: safe.y };
  const geometry = withBand(input, block, height);
  const panelY = rectBottom(geometry.frame) + SHADOW + gutter;
  const bottomPanel = {
    x: geometry.frame.x,
    y: panelY,
    width: geometry.frame.width + SHADOW,
    height: rectBottom(safe) - panelY,
  };
  return { ...geometry, bottomPanel };
}

/** A CSS segment in logical px, shrunk to the whole logical pixels inside it (away from the fold). */
function logicalSegment(segment: Rect, context: ScaleContext): Rect {
  const { scale, canvasOffsetDevice: offset } = context.placement;
  const dpr = context.devicePixelRatio;
  const x = ceilSafe((segment.x * dpr - offset.x) / scale);
  const y = ceilSafe((segment.y * dpr - offset.y) / scale);
  const right = floorSafe((rectRight(segment) * dpr - offset.x) / scale);
  const bottom = floorSafe((rectBottom(segment) * dpr - offset.y) / scale);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}

/** Tabletop: field in the upper segment, panel in the lower one, the fold plus guards between them. */
function fitTabletop(
  input: FitInput,
  segments: readonly [Rect, Rect],
): ArrangementGeometry | undefined {
  const { safe } = input.context.placement;
  const { guard } = input.context;
  const upper = logicalSegment(segments[0], input.context);
  const lower = logicalSegment(segments[1], input.context);
  const upperEnd = rectBottom(upper) - guard;
  const lowerStart = lower.y + guard;
  const lowerEnd = rectBottom(lower);
  const fieldSegment = intersectRects({ ...upper, height: Math.max(0, upperEnd - upper.y) }, safe);
  const segmentPanel = intersectRects(
    { ...lower, y: lowerStart, height: Math.max(0, lowerEnd - lowerStart) },
    safe,
  );
  const geometry = fitBanded(fieldSegment, input);
  if (geometry === undefined) {
    return undefined;
  }
  const hinge = { x: safe.x, y: upperEnd, width: safe.width, height: lowerStart - upperEnd };
  return { ...geometry, fieldSegment, segmentPanel, hinge };
}

/** Book: field in the wider segment (tie → left), panel in the other, the fold plus guards between. */
function fitBook(
  input: FitInput,
  segments: readonly [Rect, Rect],
): ArrangementGeometry | undefined {
  const { safe } = input.context.placement;
  const { guard } = input.context;
  const left = logicalSegment(segments[0], input.context);
  const right = logicalSegment(segments[1], input.context);
  const leftEnd = rectRight(left) - guard;
  const rightStart = right.x + guard;
  const rightEnd = rectRight(right);
  const leftPart = intersectRects({ ...left, width: Math.max(0, leftEnd - left.x) }, safe);
  const rightPart = intersectRects(
    { ...right, x: rightStart, width: Math.max(0, rightEnd - rightStart) },
    safe,
  );
  const isLeftWider = leftPart.width >= rightPart.width;
  const fieldSegment = isLeftWider ? leftPart : rightPart;
  const geometry = fitBanded(fieldSegment, input);
  if (geometry === undefined) {
    return undefined;
  }
  const segmentPanel = isLeftWider ? rightPart : leftPart;
  const hinge = { x: leftEnd, y: safe.y, width: rightStart - leftEnd, height: safe.height };
  return { ...geometry, fieldSegment, segmentPanel, hinge };
}

/** The two segments of a folded posture, or undefined when there are not exactly two. */
function segmentPair(segments: readonly Rect[]): readonly [Rect, Rect] | undefined {
  const [first, second] = segments;
  return first === undefined || second === undefined ? undefined : [first, second];
}

/** Fits `arrangement` at the scale of `input.context`; undefined when it does not fit. */
export function fitArrangement(
  arrangement: Arrangement,
  input: FitInput,
): ArrangementGeometry | undefined {
  const pair = segmentPair(input.segments);
  switch (arrangement) {
    case 'sides':
      return fitSides(input);
    case 'banded':
      return fitBanded(input.context.placement.safe, input);
    case 'stacked':
      return fitStacked(input);
    case 'tabletop':
      return pair === undefined ? undefined : fitTabletop(input, pair);
    case 'book':
      return pair === undefined ? undefined : fitBook(input, pair);
  }
}
