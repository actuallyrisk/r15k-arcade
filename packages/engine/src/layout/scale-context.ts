// Everything the layout derives from one integer scale: canvas size and offset, the logical safe rect,
// text choices, touch target and hinge guard. Every threshold is evaluated in device units (see
// device-math.ts), so DPR values such as 2.625 never shift a result by a pixel.
import type { Point, Rect, Size } from '../math/geometry.ts';
import { ceilSafe, isAtLeast } from './device-math.ts';
import type { LayoutRules, TextCandidate } from './layout-rules.ts';
import type { CanvasPlacement, SizeClass, ViewportSnapshot } from './layout-types.ts';

/** A text candidate and whether it meets its CSS-px minimum at this scale. */
export interface TextPick {
  readonly candidate: TextCandidate;
  readonly isReadable: boolean;
}

/** The placement of one scale plus the values the arrangements need. */
export interface ScaleContext {
  readonly placement: CanvasPlacement;
  readonly devicePixelRatio: number;
  readonly hud: TextPick;
  readonly menu: TextPick;
  /** Logical px kept clear on both sides of a fold line. */
  readonly guard: number;
}

/** Device-pixel margins between the viewport edges and the canvas. */
interface CanvasFit {
  readonly logical: Size;
  readonly canvasDevice: Size;
  readonly offset: Point;
  readonly far: Point;
}

function fitCanvas(viewport: ViewportSnapshot, scale: number): CanvasFit {
  const logical = {
    width: Math.floor(viewport.deviceWidth / scale),
    height: Math.floor(viewport.deviceHeight / scale),
  };
  const canvasDevice = { width: logical.width * scale, height: logical.height * scale };
  const spareX = viewport.deviceWidth - canvasDevice.width;
  const spareY = viewport.deviceHeight - canvasDevice.height;
  const offset = { x: Math.floor(spareX / 2), y: Math.floor(spareY / 2) };
  return { logical, canvasDevice, offset, far: { x: spareX - offset.x, y: spareY - offset.y } };
}

/** Logical inset of one side: the part of the CSS inset that the canvas margin does not absorb. */
function insetAt(
  insetCss: number,
  marginDevice: number,
  context: { dpr: number; scale: number },
): number {
  return ceilSafe(Math.max(0, insetCss * context.dpr - marginDevice) / context.scale);
}

function safeRect(viewport: ViewportSnapshot, fit: CanvasFit, scale: number): Rect {
  const context = { dpr: viewport.devicePixelRatio, scale };
  const { safeArea } = viewport;
  const left = insetAt(safeArea.left, fit.offset.x, context);
  const top = insetAt(safeArea.top, fit.offset.y, context);
  const right = insetAt(safeArea.right, fit.far.x, context);
  const bottom = insetAt(safeArea.bottom, fit.far.y, context);
  return {
    x: left,
    y: top,
    width: Math.max(0, fit.logical.width - left - right),
    height: Math.max(0, fit.logical.height - top - bottom),
  };
}

/** The first candidate whose cap height reaches `minimumCss` CSS px; the last one when none does. */
export function pickText(
  candidates: readonly TextCandidate[],
  minimumCss: number,
  context: { readonly scale: number; readonly dpr: number },
): TextPick {
  for (const candidate of candidates) {
    if (isAtLeast(candidate.capHeight * context.scale, minimumCss * context.dpr)) {
      return { candidate, isReadable: true };
    }
  }
  const last = candidates.at(-1);
  if (last === undefined) {
    throw new Error('Layout rules need at least one text candidate per role.');
  }
  return { candidate: last, isReadable: false };
}

function sizeClassOf(
  safe: Rect,
  context: { scale: number; dpr: number },
  rules: LayoutRules,
): SizeClass {
  const widthDevice = safe.width * context.scale;
  const heightDevice = safe.height * context.scale;
  if (!isAtLeast(widthDevice, rules.compactMaxCssWidth * context.dpr)) {
    return 'compact';
  }
  const largeDevice = rules.largeMinCssSide * context.dpr;
  return isAtLeast(widthDevice, largeDevice) && isAtLeast(heightDevice, largeDevice)
    ? 'large'
    : 'regular';
}

/** Computes the canvas placement and the derived values for the integer scale `scale`. */
export function scaleContext(
  viewport: ViewportSnapshot,
  scale: number,
  rules: LayoutRules,
): ScaleContext {
  const dpr = viewport.devicePixelRatio;
  const context = { scale, dpr };
  const fit = fitCanvas(viewport, scale);
  const safe = safeRect(viewport, fit, scale);
  const menu = pickText(rules.menuCandidates, rules.minMenuCssPx, context);
  const placement: CanvasPlacement = {
    scale,
    cssPerLogical: scale / dpr,
    logical: fit.logical,
    canvasDevice: fit.canvasDevice,
    canvasOffsetDevice: fit.offset,
    canvasCss: {
      x: fit.offset.x / dpr,
      y: fit.offset.y / dpr,
      width: fit.canvasDevice.width / dpr,
      height: fit.canvasDevice.height / dpr,
    },
    safe,
    menuText: menu.candidate.choice,
    minTouchTarget: ceilSafe((rules.minTouchCssPx * dpr) / scale),
    sizeClass: sizeClassOf(safe, context, rules),
  };
  return {
    placement,
    devicePixelRatio: dpr,
    hud: pickText(rules.hudCandidates, rules.minHudCssPx, context),
    menu,
    guard: ceilSafe((rules.hingeGuardCssPx * dpr) / scale),
  };
}
