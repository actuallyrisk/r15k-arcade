import { centerRect, rectRight } from '@r15k/engine';
import type { Layout, Rect } from '@r15k/engine';
import { capHeightOf } from './text-support.ts';

/** Gap between a corner button's hit rect and the corner of its region (room for its shadow). */
const CORNER_MARGIN = 2;
/** Padding around the icon glyph of a square icon button. */
const ICON_PADDING = 6;

/** A square icon button in a corner: its hit rect (placed first) and the drawn square centred in it. */
export interface CornerButton {
  readonly hit: Rect;
  readonly button: Rect;
}

/**
 * The hub gear and the settings Back: the hit rect (≥ minTouchTarget, at least the drawn square) sits
 * in the top corner of `region`, the square is centred in it with an even difference, so expanding the
 * square to the touch target gives exactly the hit rect again.
 */
export function cornerButton(
  layout: Pick<Layout, 'minTouchTarget' | 'menuText'>,
  placement: { readonly region: Rect; readonly side: 'left' | 'right' },
): CornerButton {
  const { region, side } = placement;
  const glyphSquare = capHeightOf(layout.menuText) + ICON_PADDING;
  const size = Math.max(layout.minTouchTarget, glyphSquare);
  const square = glyphSquare + ((size - glyphSquare) % 2);
  const x = side === 'left' ? region.x + CORNER_MARGIN : rectRight(region) - CORNER_MARGIN - size;
  const hit = { x, y: region.y + CORNER_MARGIN, width: size, height: size };
  return { hit, button: centerRect(hit, { width: square, height: square }) };
}
