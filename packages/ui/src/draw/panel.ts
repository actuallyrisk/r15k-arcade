import { fillRect, strokeRect } from '@r15k/engine';
import type { DrawTarget, Rect, SlotIndex } from '@r15k/engine';
import { UI_THEME } from '../theme/ui-theme.ts';
import { drawHardShadow } from './hard-shadow.ts';

/** Overrides of the panel look; defaults: paper fill, ink border, shadow slot, offset 3. */
export interface PanelStyle {
  readonly fill?: SlotIndex;
  readonly border?: SlotIndex;
  readonly shadow?: SlotIndex;
  /** Hard shadow offset right and down in logical px; 0 draws no shadow. */
  readonly shadowOffset?: number;
}

const PANEL_SHADOW_OFFSET = 3;

/** A panel as on r15k.dev: hard shadow +3/+3, 1 px ink frame, paper fill; no rounding, no gradient. */
export function drawPanel(target: DrawTarget, rect: Rect, style?: PanelStyle): void {
  drawHardShadow(target, rect, {
    slot: style?.shadow ?? UI_THEME.panelShadow,
    offset: style?.shadowOffset ?? PANEL_SHADOW_OFFSET,
  });
  fillRect(target, rect, style?.fill ?? UI_THEME.panelFill);
  strokeRect(target, rect, style?.border ?? UI_THEME.panelBorder);
}

/** The playfield frame: shadow (frame + 3/+3), then a 1 px ink outline; the interior is left as is. */
export function drawFramedField(target: DrawTarget, frame: Rect): void {
  drawHardShadow(target, frame, { slot: UI_THEME.panelShadow, offset: PANEL_SHADOW_OFFSET });
  strokeRect(target, frame, UI_THEME.panelBorder);
}
