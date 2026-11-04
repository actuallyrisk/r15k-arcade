import type { Point, Rect } from '../math/geometry.ts';
import { notImplemented } from '../util/assert.ts';
import type { DrawTarget } from './draw-target.ts';
import type { SlotIndex } from './slots.ts';

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
export function setPixel(_target: DrawTarget, _point: Point, _slot: SlotIndex): void {
  return notImplemented('engine.setPixel');
}

/** Fills a rectangle (clipped, never anti-aliased). */
export function fillRect(_target: DrawTarget, _rect: Rect, _slot: SlotIndex): void {
  return notImplemented('engine.fillRect');
}

/** Draws a 1 px outline inside the rectangle. */
export function strokeRect(_target: DrawTarget, _rect: Rect, _slot: SlotIndex): void {
  return notImplemented('engine.strokeRect');
}

/** Draws a horizontal line. */
export function drawHLine(_target: DrawTarget, _line: LineSpec): void {
  return notImplemented('engine.drawHLine');
}

/** Draws a vertical line. */
export function drawVLine(_target: DrawTarget, _line: LineSpec): void {
  return notImplemented('engine.drawVLine');
}

/**
 * Fills a dot pattern: a dot at (x, y) when (y − rect.y) % stepY === 0 and
 * (x − rect.x − (odd row ? oddRowShift : 0)) % stepX === 0.
 */
export function fillDither(_target: DrawTarget, _rect: Rect, _spec: DitherSpec): void {
  return notImplemented('engine.fillDither');
}
