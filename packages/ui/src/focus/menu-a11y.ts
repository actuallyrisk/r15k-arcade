import type { A11yNode } from '@r15k/engine';
import { ALPHABET } from '../widgets/initials-layout.ts';
import { initialsHitAreas } from '../widgets/widget-geometry.ts';
import type { InitialsWidget, Widget } from '../widgets/widget-types.ts';
import type { MenuState } from './menu-reducer.ts';
import { hitRect } from './pointer-hit.ts';

/** The three letter sliders of an initials widget, at its hit boxes. */
function initialsNodes(
  widget: InitialsWidget,
  options: { readonly minTouchTarget: number; readonly initialsLetter: (index: number) => string },
): readonly A11yNode[] {
  return initialsHitAreas(widget, options.minTouchTarget).map((area) => {
    const letter = widget.letters.charAt(area.index);
    return {
      kind: 'slider',
      id: `${widget.id}.${String(area.index)}`,
      rect: area.box,
      label: options.initialsLetter(area.index),
      value: Math.max(0, ALPHABET.indexOf(letter)),
      min: 0,
      max: ALPHABET.length - 1,
      step: 1,
      valueText: letter,
      isDisabled: widget.isDisabled,
    };
  });
}

/** The mirror node of one widget, at its hit rect. */
function widgetNodes(
  widget: Widget,
  options: { readonly minTouchTarget: number; readonly initialsLetter: (index: number) => string },
): readonly A11yNode[] {
  const base = {
    id: widget.id,
    rect: hitRect(widget.rect, options.minTouchTarget),
    label: widget.label,
  };
  const { isDisabled } = widget;
  switch (widget.kind) {
    case 'button':
      return [{ ...base, kind: 'button', isDisabled }];
    case 'toggle':
      return [{ ...base, kind: 'switch', isOn: widget.isOn, isDisabled }];
    case 'slider': {
      const { value, min, max, step, valueText } = widget;
      return [{ ...base, kind: 'slider', value, min, max, step, valueText, isDisabled }];
    }
    case 'selector':
      return [
        {
          ...base,
          kind: 'select',
          options: widget.options,
          selectedId: widget.selectedId,
          isDisabled,
        },
      ];
    case 'initials':
      return initialsNodes(widget, options);
  }
}

/**
 * Mirror nodes of a menu: button/switch/slider/select nodes at hitRect(widget.rect, minTouchTarget);
 * initials as three sliders `<id>.0…2` (value = alphabet index, valueText = letter, label from
 * `initialsLetter(index)` with the 0-based letter index) at the boxes of initialsHitAreas.
 */
export function menuA11yNodes(
  state: MenuState,
  options: { readonly minTouchTarget: number; readonly initialsLetter: (index: number) => string },
): readonly A11yNode[] {
  return state.widgets.flatMap((widget) => widgetNodes(widget, options));
}
