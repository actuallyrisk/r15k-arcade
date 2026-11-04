import { notImplemented } from '@r15k/engine';
import type { DrawTarget } from '@r15k/engine';
import type { SliderWidget, WidgetDrawOptions } from './widget-types.ts';

/** Draws a slider row: label left, track with thumb, value text right. */
export function drawSlider(
  _target: DrawTarget,
  _widget: SliderWidget,
  _options: WidgetDrawOptions,
): void {
  return notImplemented('ui.drawSlider');
}
