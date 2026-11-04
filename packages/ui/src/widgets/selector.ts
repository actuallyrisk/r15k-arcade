import { notImplemented } from '@r15k/engine';
import type { DrawTarget } from '@r15k/engine';
import type { SelectorWidget, WidgetDrawOptions } from './widget-types.ts';

/** Draws a selector row: label left, `← value →` right. */
export function drawSelector(
  _target: DrawTarget,
  _widget: SelectorWidget,
  _options: WidgetDrawOptions,
): void {
  return notImplemented('ui.drawSelector');
}
