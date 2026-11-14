import { strokeRect } from '@r15k/engine';
import type { DrawTarget, Layout, TextChoice } from '@r15k/engine';
import { drawButton, drawLabel, ICONS, UI_THEME } from '@r15k/ui';
import type { HudPlacement } from './hud-placement.ts';
import { capHeightOf } from './text-styles.ts';

/** Free pixels the icon keeps to the square's border on each side. */
const ICON_MARGIN = 2;

/** The largest of the layout's text choices whose pause glyph fits the square. */
function iconStyle(layout: Layout, side: number): TextChoice {
  return capHeightOf(layout.menuText) + 2 * ICON_MARGIN <= side ? layout.menuText : layout.hudText;
}

/**
 * The pause button. On the ink band (banded) it is a paper outline with the pause glyph; on paper it
 * is the UI's square icon button.
 */
export function drawPauseButton(target: DrawTarget, layout: Layout, placement: HudPlacement): void {
  const square = placement.pause;
  const style = iconStyle(layout, square.width);
  if (layout.arrangement === 'banded') {
    strokeRect(target, square, UI_THEME.hudText);
    drawLabel(target, ICONS.pause, {
      style,
      slot: UI_THEME.hudText,
      x: square.x + Math.floor(square.width / 2),
      y: square.y + Math.floor((square.height - capHeightOf(style)) / 2),
      align: 'center',
    });
    return;
  }
  drawButton(
    target,
    {
      kind: 'button',
      id: 'pause',
      rect: square,
      label: '',
      isDisabled: false,
      variant: 'icon',
      icon: 'pause',
    },
    { text: style, isFocused: false, hasFocusRing: false, isPressed: false },
  );
}
