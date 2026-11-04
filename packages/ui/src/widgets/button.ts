import { notImplemented } from '@r15k/engine';
import type { DrawTarget } from '@r15k/engine';
import type { ButtonWidget, WidgetDrawOptions } from './widget-types.ts';

/** Draws a primary, secondary or icon button. */
export function drawButton(
  _target: DrawTarget,
  _widget: ButtonWidget,
  _options: WidgetDrawOptions,
): void {
  return notImplemented('ui.drawButton');
}
