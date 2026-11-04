import { notImplemented } from '@r15k/engine';
import type { DrawTarget } from '@r15k/engine';
import type { Widget, WidgetDrawOptions } from './widget-types.ts';

/** Draws any widget (exhaustive dispatch on its kind). */
export function drawWidget(
  _target: DrawTarget,
  _widget: Widget,
  _options: WidgetDrawOptions,
): void {
  return notImplemented('ui.drawWidget');
}
