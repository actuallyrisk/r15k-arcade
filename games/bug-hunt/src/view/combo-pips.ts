import { fillRect, strokeRect } from '@r15k/engine';
import type { DrawTarget } from '@r15k/engine';
import { UI_THEME } from '@r15k/ui';
import { TUNING } from '../content/tuning.ts';

/** Gap between two pips in px. */
const PIP_GAP = 2;

/** Streak at which each multiplier begins, 1× to 4×. */
const STAGE_STARTS = [0, TUNING.combo.stage2, TUNING.combo.stage3, TUNING.combo.stage4] as const;

/**
 * Pips filled for a streak: the progress from the current stage's start to the last catch before the
 * next stage, in `hud.comboPips` steps (rounded down), so the row is full right before the stage-up;
 * all pips at 4×.
 */
export function comboPipsFilled(streak: number): number {
  const pips = TUNING.hud.comboPips;
  const stage = STAGE_STARTS.filter((start) => streak >= start).length - 1;
  const start = STAGE_STARTS[stage] ?? 0;
  const next = STAGE_STARTS[stage + 1];
  if (next === undefined) {
    return pips;
  }
  return Math.floor(((streak - start) * pips) / (next - start - 1));
}

/** Width of the pip row for a pip size. */
export function pipsWidth(size: number): number {
  const pips = TUNING.hud.comboPips;
  return pips * size + (pips - 1) * PIP_GAP;
}

/** The pip row: filled ink squares for progress, outlined squares for the rest (shape, not only colour). */
export function drawPips(
  target: DrawTarget,
  row: { readonly x: number; readonly y: number; readonly size: number; readonly filled: number },
): void {
  for (let index = 0; index < TUNING.hud.comboPips; index += 1) {
    const rect = {
      x: row.x + index * (row.size + PIP_GAP),
      y: row.y,
      width: row.size,
      height: row.size,
    };
    if (index < row.filled) {
      fillRect(target, rect, UI_THEME.text);
    } else {
      strokeRect(target, rect, UI_THEME.text);
    }
  }
}
