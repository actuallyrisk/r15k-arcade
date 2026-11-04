import { notImplemented } from '@r15k/engine';
import type { DrawTarget, Rect, TextChoice } from '@r15k/engine';
import type { ButtonWidget, WidgetDrawOptions } from './widget-types.ts';

/** A dialog panel with a title, a wrapped message and buttons. */
export interface DialogModel {
  readonly title: string;
  readonly message: string;
  readonly buttons: readonly ButtonWidget[];
}

/** Places the dialog in `region` and fills in the button rects. */
export function layoutDialog(
  _region: Rect,
  _model: DialogModel,
  _options: { readonly text: TextChoice; readonly minTouchTarget: number },
): DialogModel {
  return notImplemented('ui.layoutDialog');
}

/** Draws a laid-out dialog. */
export function drawDialog(
  _target: DrawTarget,
  _model: DialogModel,
  _options: WidgetDrawOptions,
): void {
  return notImplemented('ui.drawDialog');
}
