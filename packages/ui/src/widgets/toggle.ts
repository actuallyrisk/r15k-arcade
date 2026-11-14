import type { DrawTarget } from '@r15k/engine';
import { drawLabel } from '../draw/label.ts';
import { drawnRow, CONTROL_SHADOW } from './row-layout.ts';
import { drawRowFocus, drawRowLabel } from './row-draw.ts';
import { boxLook, drawBox } from './widget-look.ts';
import type { ToggleWidget, WidgetDrawOptions } from './widget-types.ts';

/**
 * Draws a toggle row: label left, a box with the on/off text right. On is an ink box with paper text,
 * off a paper box with ink text, so the state never depends on colour alone.
 */
export function drawToggle(
  target: DrawTarget,
  widget: ToggleWidget,
  options: WidgetDrawOptions,
): void {
  const row = drawnRow(widget, options.text);
  drawRowLabel(target, widget, { row, options });
  const box = { ...row.value, width: row.value.width - CONTROL_SHADOW };
  const look = boxLook(widget.isOn ? 'primary' : 'secondary', {
    isPressed: options.isPressed,
    isDisabled: widget.isDisabled,
  });
  drawBox(target, box, look);
  drawLabel(target, widget.isOn ? widget.onText : widget.offText, {
    style: options.text,
    slot: look.text,
    x: box.x + Math.floor(box.width / 2) + look.shift,
    y: row.valueY + look.shift,
    align: 'center',
  });
  drawRowFocus(target, widget, options);
}
