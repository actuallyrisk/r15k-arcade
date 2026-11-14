import type { DrawTarget, LayoutResult, Translator } from '@r15k/engine';
import { drawGridPaper, drawLabel, UI_THEME, wrapLabel } from '@r15k/ui';
import { blockHeightOf, lineStepOf } from './text-support.ts';

/** Margin between the notice and the safe area's edges (logical px). */
const MARGIN = 4;

/** Grid paper and the centred, wrapped "window too small" notice. */
export function drawTooSmall(target: DrawTarget, layout: LayoutResult, i18n: Translator): void {
  const { safe, menuText: style } = layout;
  drawGridPaper(target, { x: 0, y: 0, ...layout.logical });
  const lines = wrapLabel(i18n.t('arcade.tooSmall.message'), {
    style,
    maxWidth: Math.max(1, safe.width - 2 * MARGIN),
  });
  const top = safe.y + Math.floor((safe.height - blockHeightOf(lines.length, style)) / 2);
  const centreX = safe.x + Math.floor(safe.width / 2);
  lines.forEach((line, index) => {
    drawLabel(target, line, {
      style,
      slot: UI_THEME.text,
      x: centreX,
      y: top + index * lineStepOf(style),
      align: 'center',
    });
  });
}
