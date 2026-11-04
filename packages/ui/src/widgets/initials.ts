import { notImplemented } from '@r15k/engine';
import type { DrawTarget } from '@r15k/engine';
import type { InitialsWidget, WidgetDrawOptions, WidgetIntent } from './widget-types.ts';

/** Characters an initial can take, in the order up/down steps through them. */
export const INITIALS_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Number of initials. */
export const INITIALS_LENGTH = 3;

/** Draws the three letter boxes, the cursor box and its ↑/↓ arrows. */
export function drawInitials(
  _target: DrawTarget,
  _widget: InitialsWidget,
  _options: WidgetDrawOptions,
): void {
  return notImplemented('ui.drawInitials');
}

/** Applies a navigation action to the focused initials (`back` is handled by the menu reducer). */
export function stepInitials(
  _widget: InitialsWidget,
  _action: 'up' | 'down' | 'left' | 'right' | 'confirm',
): WidgetIntent {
  return notImplemented('ui.stepInitials');
}

/** Sets the letter at the cursor and moves the cursor one box right (clamped). */
export function typeInitial(_widget: InitialsWidget, _char: string): WidgetIntent {
  return notImplemented('ui.typeInitial');
}
