import { notImplemented } from '@r15k/engine';
import type { DrawTarget } from '@r15k/engine';
import type { ToggleWidget, WidgetDrawOptions } from './widget-types.ts';

/** Draws a toggle row: label left, a box with the on/off text right. */
export function drawToggle(
  _target: DrawTarget,
  _widget: ToggleWidget,
  _options: WidgetDrawOptions,
): void {
  return notImplemented('ui.drawToggle');
}
