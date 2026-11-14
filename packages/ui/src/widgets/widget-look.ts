import { fillRect, strokeRect } from '@r15k/engine';
import type { DrawTarget, Rect, SlotIndex } from '@r15k/engine';
import { drawFocusRing } from '../draw/focus-ring.ts';
import { drawHardShadow } from '../draw/hard-shadow.ts';
import { UI_THEME } from '../theme/ui-theme.ts';
import { CONTROL_SHADOW } from './row-layout.ts';
import type { WidgetDrawOptions } from './widget-types.ts';

// The box look shared by buttons, the toggle box and the initials boxes: R15K neo-brutalism with a 1 px
// border and a hard shadow. Pressed and disabled always change the shape too (no shadow, content
// shifted), never only the colour.

/** Colours and shape of one box. */
export interface BoxLook {
  readonly fill: SlotIndex;
  readonly border: SlotIndex;
  readonly text: SlotIndex;
  readonly hasShadow: boolean;
  /** Offset of the content right and down (1 when pressed). */
  readonly shift: number;
}

/** The base look of a box before pressed/disabled states. */
export type BoxVariant = 'primary' | 'secondary' | 'selected';

const BASE_LOOKS: Readonly<Record<BoxVariant, BoxLook>> = {
  primary: {
    fill: UI_THEME.buttonFill,
    border: UI_THEME.panelBorder,
    text: UI_THEME.buttonText,
    hasShadow: true,
    shift: 0,
  },
  secondary: {
    fill: UI_THEME.panelFill,
    border: UI_THEME.panelBorder,
    text: UI_THEME.text,
    hasShadow: true,
    shift: 0,
  },
  selected: {
    fill: UI_THEME.selectedFill,
    border: UI_THEME.selectedBorder,
    text: UI_THEME.text,
    hasShadow: true,
    shift: 0,
  },
};

const PRESSED_LOOK: BoxLook = {
  fill: UI_THEME.selectedFill,
  border: UI_THEME.selectedBorder,
  text: UI_THEME.text,
  hasShadow: false,
  shift: 1,
};

const DISABLED_LOOK: BoxLook = {
  fill: UI_THEME.disabledFill,
  border: UI_THEME.disabledBorder,
  text: UI_THEME.disabledText,
  hasShadow: false,
  shift: 0,
};

/** The look of a box for a variant and the widget state (disabled wins over pressed). */
export function boxLook(
  variant: BoxVariant,
  state: { readonly isPressed: boolean; readonly isDisabled: boolean },
): BoxLook {
  if (state.isDisabled) {
    return DISABLED_LOOK;
  }
  return state.isPressed ? PRESSED_LOOK : BASE_LOOKS[variant];
}

/** Draws a box: shadow +2/+2 (if any), fill, 1 px border. */
export function drawBox(target: DrawTarget, rect: Rect, look: BoxLook): void {
  if (look.hasShadow) {
    drawHardShadow(target, rect, { slot: UI_THEME.panelShadow, offset: CONTROL_SHADOW });
  }
  fillRect(target, rect, look.fill);
  strokeRect(target, rect, look.border);
}

/** The rectangle a box covers including its shadow. */
export function withShadow(rect: Rect): Rect {
  return { ...rect, width: rect.width + CONTROL_SHADOW, height: rect.height + CONTROL_SHADOW };
}

/** Draws the focus ring around `rect` when the widget is focused and rings are shown. */
export function drawFocusIfShown(target: DrawTarget, rect: Rect, options: WidgetDrawOptions): void {
  if (options.isFocused && options.hasFocusRing) {
    drawFocusRing(target, rect);
  }
}
