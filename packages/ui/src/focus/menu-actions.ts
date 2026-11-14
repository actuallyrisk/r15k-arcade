import { stepInitials } from '../widgets/initials.ts';
import { steppedValue } from '../widgets/slider-math.ts';
import type {
  InitialsWidget,
  SelectorWidget,
  SliderWidget,
  Widget,
  WidgetIntent,
} from '../widgets/widget-types.ts';

// What a widget does for one navigation action, as an intent (undefined when nothing changes).

/** The slider moved one step (clamped); undefined at the end of the range. */
export function sliderStep(widget: SliderWidget, direction: 1 | -1): WidgetIntent | undefined {
  return sliderTo(widget, widget.value + direction * widget.step);
}

/** The slider set to a value (stepped, clamped); undefined when the value does not change. */
export function sliderTo(widget: SliderWidget, value: number): WidgetIntent | undefined {
  const next = steppedValue(widget, value);
  return next === widget.value ? undefined : { kind: 'change', id: widget.id, value: next };
}

/** The previous or next option of a selector (wraps); undefined without options. */
export function selectorStep(widget: SelectorWidget, direction: 1 | -1): WidgetIntent | undefined {
  const count = widget.options.length;
  if (count === 0) {
    return undefined;
  }
  const current = widget.options.findIndex((option) => option.id === widget.selectedId);
  const start = current === -1 ? (direction === 1 ? -1 : 0) : current;
  const option = widget.options[(start + direction + count) % count];
  return option === undefined ? undefined : { kind: 'select', id: widget.id, optionId: option.id };
}

/** The initials after an action; undefined when the action changes neither letter nor cursor. */
export function initialsStep(
  widget: InitialsWidget,
  action: 'up' | 'down' | 'left' | 'right' | 'confirm',
): WidgetIntent | undefined {
  const intent = stepInitials(widget, action);
  const isUnchanged =
    intent.kind === 'initials' &&
    !intent.isComplete &&
    intent.letters === widget.letters &&
    intent.cursor === widget.cursor;
  return isUnchanged ? undefined : intent;
}

/** What `confirm` does: button activate, toggle toggle, selector next, initials cursor +1; slider nothing. */
export function confirmIntent(widget: Widget): WidgetIntent | undefined {
  switch (widget.kind) {
    case 'button':
      return { kind: 'activate', id: widget.id };
    case 'toggle':
      return { kind: 'toggle', id: widget.id, isOn: !widget.isOn };
    case 'selector':
      return selectorStep(widget, 1);
    case 'initials':
      return initialsStep(widget, 'confirm');
    case 'slider':
      return undefined;
  }
}

/** What left/right do in a vertical menu: slider ∓step, selector previous/next, toggle toggles. */
export function sideIntent(widget: Widget, direction: 1 | -1): WidgetIntent | undefined {
  switch (widget.kind) {
    case 'slider':
      return sliderStep(widget, direction);
    case 'selector':
      return selectorStep(widget, direction);
    case 'toggle':
      return { kind: 'toggle', id: widget.id, isOn: !widget.isOn };
    case 'initials':
      return initialsStep(widget, direction === 1 ? 'right' : 'left');
    case 'button':
      return undefined;
  }
}
