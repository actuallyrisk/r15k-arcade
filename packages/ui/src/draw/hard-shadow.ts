import { fillRect } from '@r15k/engine';
import type { DrawTarget, Rect, SlotIndex } from '@r15k/engine';

/**
 * Draws the visible part of a hard shadow: the rectangle moved right and down by `offset`, without the
 * part the rectangle itself covers (so it never shows through a transparent or later-drawn interior).
 * An offset ≤ 0 draws nothing.
 */
export function drawHardShadow(
  target: DrawTarget,
  rect: Rect,
  shadow: { readonly slot: SlotIndex; readonly offset: number },
): void {
  const { offset, slot } = shadow;
  if (offset <= 0) {
    return;
  }
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  fillRect(target, { x: right, y: rect.y + offset, width: offset, height: rect.height }, slot);
  fillRect(
    target,
    { x: rect.x + offset, y: bottom, width: rect.width - offset, height: offset },
    slot,
  );
}
