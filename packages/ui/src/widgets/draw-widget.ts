import type { DrawTarget } from '@r15k/engine';
import { drawButton } from './button.ts';
import { drawInitials } from './initials.ts';
import { drawSelector } from './selector.ts';
import { drawSlider } from './slider.ts';
import { drawToggle } from './toggle.ts';
import type { Widget, WidgetDrawOptions } from './widget-types.ts';

/** Draws any widget (exhaustive dispatch on its kind). */
export function drawWidget(target: DrawTarget, widget: Widget, options: WidgetDrawOptions): void {
  switch (widget.kind) {
    case 'button':
      drawButton(target, widget, options);
      return;
    case 'toggle':
      drawToggle(target, widget, options);
      return;
    case 'slider':
      drawSlider(target, widget, options);
      return;
    case 'selector':
      drawSelector(target, widget, options);
      return;
    case 'initials':
      drawInitials(target, widget, options);
      return;
  }
}
