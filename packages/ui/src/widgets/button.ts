import type { DrawTarget } from '@r15k/engine';
import { drawLabel } from '../draw/label.ts';
import { ICONS } from '../text/icons.ts';
import { capHeightOf } from '../text/text-metrics.ts';
import { boxLook, drawBox, drawFocusIfShown, withShadow } from './widget-look.ts';
import type { ButtonWidget, WidgetDrawOptions } from './widget-types.ts';

/** What a button shows: the icon alone (icon variant), icon and label, or the label. */
function buttonText(widget: ButtonWidget): string {
  if (widget.icon === undefined) {
    return widget.label;
  }
  const icon = ICONS[widget.icon];
  return widget.variant === 'icon' ? icon : `${icon} ${widget.label}`;
}

/**
 * Draws a primary (ink fill, paper text), secondary (paper fill, ink text) or icon button (secondary,
 * icon glyph centred), each with a 1 px ink border and a hard shadow +2/+2. Pressed: selected fill and
 * border, no shadow, content +1/+1. Disabled: disabled roles, no shadow. The focus ring surrounds the
 * button and its shadow.
 */
export function drawButton(
  target: DrawTarget,
  widget: ButtonWidget,
  options: WidgetDrawOptions,
): void {
  const { rect } = widget;
  const look = boxLook(widget.variant === 'primary' ? 'primary' : 'secondary', {
    isPressed: options.isPressed,
    isDisabled: widget.isDisabled,
  });
  drawBox(target, rect, look);
  drawLabel(target, buttonText(widget), {
    style: options.text,
    slot: look.text,
    x: rect.x + Math.floor(rect.width / 2) + look.shift,
    y: rect.y + Math.floor((rect.height - capHeightOf(options.text)) / 2) + look.shift,
    align: 'center',
  });
  drawFocusIfShown(target, withShadow(rect), options);
}
