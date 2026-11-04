import { notImplemented } from '@r15k/engine';
import type { DrawTarget, LayoutResult, Translator } from '@r15k/engine';

/** Grid paper and the centred, wrapped "window too small" notice. */
export function drawTooSmall(_target: DrawTarget, _layout: LayoutResult, _i18n: Translator): void {
  return notImplemented('arcade.drawTooSmall');
}
