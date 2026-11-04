import type { Point, Rect } from '../math/geometry.ts';
import type { DrawTarget } from './draw-target.ts';
import { clipBounds, fillPixelRect, toPixelRect } from './raster.ts';
import type { PixelBounds } from './raster.ts';
import { SLOT } from './slots.ts';
import type { SlotIndex } from './slots.ts';

// Integer coordinates (non-integers are floored), clipped to the target, never anti-aliased. Drawing
// with SLOT.transparent leaves the framebuffer unchanged.

/** A horizontal or vertical line of `length` pixels starting at (x, y). */
export interface LineSpec {
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly slot: SlotIndex;
}

/** An ordered dot pattern: every `stepX`-th pixel of every `stepY`-th row, odd rows shifted. */
export interface DitherSpec {
  readonly slot: SlotIndex;
  readonly stepX: number;
  readonly stepY: number;
  readonly oddRowShift: number;
}

/** Sets one pixel (coordinates floored, clipped). */
export function setPixel(target: DrawTarget, point: Point, slot: SlotIndex): void {
  fillPixelRect(target, toPixelRect(target, { x: point.x, y: point.y, width: 1, height: 1 }), slot);
}

/** Fills a rectangle (clipped, never anti-aliased). */
export function fillRect(target: DrawTarget, rect: Rect, slot: SlotIndex): void {
  fillPixelRect(target, toPixelRect(target, rect), slot);
}

/** Draws a 1 px outline inside the rectangle. */
export function strokeRect(target: DrawTarget, rect: Rect, slot: SlotIndex): void {
  const { x, y, width, height } = toPixelRect(target, rect);
  if (width <= 0 || height <= 0) {
    return;
  }
  fillPixelRect(target, { x, y, width, height: 1 }, slot);
  fillPixelRect(target, { x, y: y + height - 1, width, height: 1 }, slot);
  fillPixelRect(target, { x, y: y + 1, width: 1, height: height - 2 }, slot);
  fillPixelRect(target, { x: x + width - 1, y: y + 1, width: 1, height: height - 2 }, slot);
}

/** Draws a horizontal line (a length ≤ 0 draws nothing). */
export function drawHLine(target: DrawTarget, line: LineSpec): void {
  fillRect(target, { x: line.x, y: line.y, width: line.length, height: 1 }, line.slot);
}

/** Draws a vertical line (a length ≤ 0 draws nothing). */
export function drawVLine(target: DrawTarget, line: LineSpec): void {
  fillRect(target, { x: line.x, y: line.y, width: 1, height: line.length }, line.slot);
}

/** One dithered row: dots where `(x − area.x − shift) % stepX === 0`, within the clip. */
function ditherRow(
  target: DrawTarget,
  row: { readonly y: number; readonly shift: number },
  area: {
    readonly rect: Rect;
    readonly bounds: PixelBounds;
    readonly spec: DitherSpec;
  },
): void {
  const { pixels, width } = target.framebuffer;
  const left = Math.max(area.rect.x, area.bounds.left);
  const right = Math.min(area.rect.x + area.rect.width, area.bounds.right);
  for (let x = left; x < right; x += 1) {
    if ((x - area.rect.x - row.shift) % area.spec.stepX === 0) {
      pixels[row.y * width + x] = area.spec.slot;
    }
  }
}

/**
 * Fills a dot pattern: a dot at (x, y) when (y − rect.y) % stepY === 0 and
 * (x − rect.x − (odd row ? oddRowShift : 0)) % stepX === 0, where the odd rows are every other dotted
 * row ((y − rect.y) / stepY odd). Steps must be integers ≥ 1.
 */
export function fillDither(target: DrawTarget, rect: Rect, spec: DitherSpec): void {
  if (
    !Number.isInteger(spec.stepX) ||
    !Number.isInteger(spec.stepY) ||
    spec.stepX < 1 ||
    spec.stepY < 1
  ) {
    throw new RangeError(`fillDither: steps must be integers ≥ 1, got ${spec.stepX}×${spec.stepY}`);
  }
  if (spec.slot === SLOT.transparent) {
    return;
  }
  const area = { rect: toPixelRect(target, rect), bounds: clipBounds(target), spec };
  const top = Math.max(area.rect.y, area.bounds.top);
  const bottom = Math.min(area.rect.y + area.rect.height, area.bounds.bottom);
  const shift = Math.floor(spec.oddRowShift);
  for (let y = top; y < bottom; y += 1) {
    const offset = y - area.rect.y;
    if (offset % spec.stepY === 0) {
      ditherRow(target, { y, shift: (offset / spec.stepY) % 2 === 1 ? shift : 0 }, area);
    }
  }
}
