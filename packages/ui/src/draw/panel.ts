import { notImplemented } from '@r15k/engine';
import type { DrawTarget, Rect, SlotIndex } from '@r15k/engine';

/** Overrides of the panel look; defaults: paper fill, ink border, shadow slot, offset 3. */
export interface PanelStyle {
  readonly fill?: SlotIndex;
  readonly border?: SlotIndex;
  readonly shadow?: SlotIndex;
  readonly shadowOffset?: number;
}

/** A panel: hard shadow +3/+3, 1 px ink frame, paper fill; no rounding, no gradient. */
export function drawPanel(_target: DrawTarget, _rect: Rect, _style?: PanelStyle): void {
  return notImplemented('ui.drawPanel');
}

/** The playfield frame: shadow (frame + 3/+3), then a 1 px ink outline. */
export function drawFramedField(_target: DrawTarget, _frame: Rect): void {
  return notImplemented('ui.drawFramedField');
}
