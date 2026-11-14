import { drawHLine, fillDither, fillRect, rectBottom } from '@r15k/engine';
import type { DrawTarget, Layout, Rect } from '@r15k/engine';
import { drawFramedField, drawGridPaper, UI_THEME } from '@r15k/ui';
import { TUNING } from '../content/tuning.ts';
import { groundLineY } from './item-mapping.ts';

/**
 * The ground of a rect from `groundY` down: ink line, blue band and the ink dither pattern of the
 * original (dots every ditherStepX px, rows every ditherStepY px, odd rows shifted).
 */
export function drawGround(target: DrawTarget, area: Rect, groundY: number): void {
  const bottom = rectBottom(area);
  fillRect(
    target,
    { x: area.x, y: groundY + 1, width: area.width, height: bottom - groundY - 1 },
    UI_THEME.accent,
  );
  drawHLine(target, { x: area.x, y: groundY, length: area.width, slot: UI_THEME.panelBorder });
  const ditherTop = groundY + TUNING.ground.ditherOffsetY;
  fillDither(
    target,
    { x: area.x, y: ditherTop, width: area.width, height: bottom - ditherTop },
    {
      slot: UI_THEME.panelBorder,
      stepX: TUNING.ground.ditherStepX,
      stepY: TUNING.ground.ditherStepY,
      oddRowShift: TUNING.ground.ditherOddRowShift,
    },
  );
}

/**
 * Everything behind the items: grid paper over the whole canvas, the framed field, the field's own
 * grid paper (relative to the field origin, down to the ground line) and the ground band.
 */
export function drawPlayfield(target: DrawTarget, layout: Layout): void {
  const { field } = layout;
  drawGridPaper(target, { x: 0, y: 0, width: layout.logical.width, height: layout.logical.height });
  drawFramedField(target, layout.frame);
  const groundY = groundLineY(layout);
  drawGridPaper(
    target,
    { x: field.x, y: field.y, width: field.width, height: groundY - field.y },
    { origin: { x: field.x, y: field.y } },
  );
  drawGround(target, field, groundY);
}
