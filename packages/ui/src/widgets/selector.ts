import type { DrawTarget, SlotIndex } from '@r15k/engine';
import { drawLabel } from '../draw/label.ts';
import { UI_THEME } from '../theme/ui-theme.ts';
import { drawnRow } from './row-layout.ts';
import { drawRowFocus, drawRowLabel, valueSlot } from './row-draw.ts';
import type { SelectorWidget, WidgetDrawOptions } from './widget-types.ts';

/** Label of the selected option ('' when the id matches no option). */
function selectedLabel(widget: SelectorWidget): string {
  return widget.options.find((option) => option.id === widget.selectedId)?.label ?? '';
}

/** Arrow colour: ink, blue-ink while pressed, the disabled text role when disabled. */
function arrowSlot(widget: SelectorWidget, isPressed: boolean): SlotIndex {
  if (widget.isDisabled) {
    return UI_THEME.disabledText;
  }
  return isPressed ? UI_THEME.selectedBorder : UI_THEME.text;
}

/**
 * Draws a selector row: label left, `← value →` right with the value centred between the arrows (the
 * arrows stay put for every option). Pressed: blue-ink arrows and the value part moved +1/+1.
 */
export function drawSelector(
  target: DrawTarget,
  widget: SelectorWidget,
  options: WidgetDrawOptions,
): void {
  const row = drawnRow(widget, options.text);
  drawRowLabel(target, widget, { row, options });
  const { value } = row;
  const isPressed = options.isPressed && !widget.isDisabled;
  const shift = isPressed ? 1 : 0;
  const slot = arrowSlot(widget, isPressed);
  const y = row.valueY + shift;
  const style = options.text;
  drawLabel(target, '←', { style, slot, x: value.x + shift, y });
  drawLabel(target, '→', { style, slot, x: value.x + value.width + shift, y, align: 'right' });
  drawLabel(target, selectedLabel(widget), {
    style,
    slot: valueSlot(widget),
    x: value.x + Math.floor(value.width / 2) + shift,
    y,
    align: 'center',
  });
  drawRowFocus(target, widget, options);
}
