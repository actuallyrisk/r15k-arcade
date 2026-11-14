import type { DrawTarget, SlotIndex } from '@r15k/engine';
import { drawLabel } from '../draw/label.ts';
import { UI_THEME } from '../theme/ui-theme.ts';
import type { RowLayout } from './row-layout.ts';
import type { Widget, WidgetDrawOptions } from './widget-types.ts';
import { drawFocusIfShown } from './widget-look.ts';

/** Draws the label of a row (ink, or the disabled text role). */
export function drawRowLabel(
  target: DrawTarget,
  widget: Widget,
  context: { readonly row: RowLayout; readonly options: WidgetDrawOptions },
): void {
  const { row, options } = context;
  drawLabel(target, widget.label, {
    style: options.text,
    slot: widget.isDisabled ? UI_THEME.disabledText : UI_THEME.text,
    x: row.label.x,
    y: row.labelY,
  });
}

/** Draws the focus ring around a whole row. */
export function drawRowFocus(target: DrawTarget, widget: Widget, options: WidgetDrawOptions): void {
  drawFocusIfShown(target, widget.rect, options);
}

/** The value text role of a row: accent, or the disabled text role. */
export function valueSlot(widget: Widget): SlotIndex {
  return widget.isDisabled ? UI_THEME.disabledText : UI_THEME.textAccent;
}
