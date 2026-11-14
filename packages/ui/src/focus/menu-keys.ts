import type { InputFrame } from '@r15k/engine';
import { typeInitial } from '../widgets/initials.ts';
import type { WidgetIntent } from '../widgets/widget-types.ts';
import { nextFocusable } from './focus-order.ts';
import { confirmIntent, initialsStep, sideIntent } from './menu-actions.ts';
import { emit, focusedWidget, moveFocus } from './menu-draft.ts';
import type { MenuDraft } from './menu-draft.ts';

// Keyboard and gamepad input of a menu: navigation pulses (up, down, left, right), confirm, back and
// typed characters, in this order.

/** Emits an intent if there is one. */
function emitIfAny(draft: MenuDraft, intent: WidgetIntent | undefined): void {
  if (intent !== undefined) {
    emit(draft, intent);
  }
}

/** up (−1) / down (+1): initials letter −1/+1, else the focus in a vertical menu. */
function vertical(draft: MenuDraft, direction: 1 | -1): void {
  const widget = focusedWidget(draft);
  if (widget?.kind === 'initials') {
    emitIfAny(draft, initialsStep(widget, direction === 1 ? 'down' : 'up'));
    return;
  }
  if (draft.navigation === 'vertical') {
    moveFocus(draft, nextFocusable(draft.widgets, draft.focusId, direction));
  }
}

/** left (−1) / right (+1): initials cursor, focus in a horizontal menu, else the focused value. */
function horizontal(draft: MenuDraft, direction: 1 | -1): void {
  const widget = focusedWidget(draft);
  if (widget?.kind === 'initials') {
    emitIfAny(draft, sideIntent(widget, direction));
    return;
  }
  if (draft.navigation === 'horizontal') {
    moveFocus(draft, nextFocusable(draft.widgets, draft.focusId, direction));
    return;
  }
  if (widget !== undefined) {
    emitIfAny(draft, sideIntent(widget, direction));
  }
}

/** Runs a handler once per navigation pulse. */
function repeat(count: number, handler: () => void): void {
  for (let index = 0; index < count; index += 1) {
    handler();
  }
}

/** Letters typed while the initials have the focus (only alphabet characters change them). */
function typed(draft: MenuDraft, chars: readonly string[]): void {
  for (const char of chars) {
    const widget = focusedWidget(draft);
    if (widget?.kind !== 'initials') {
      return;
    }
    const intent = typeInitial(widget, char);
    const isChange =
      intent.kind === 'initials' &&
      (intent.letters !== widget.letters || intent.cursor !== widget.cursor);
    if (isChange) {
      emit(draft, intent);
    }
  }
}

/** Applies the keyboard and gamepad part of an input frame. */
export function applyKeys(draft: MenuDraft, frame: InputFrame): void {
  const { actions } = frame;
  repeat(actions.up.pulses, () => {
    vertical(draft, -1);
  });
  repeat(actions.down.pulses, () => {
    vertical(draft, 1);
  });
  repeat(actions.left.pulses, () => {
    horizontal(draft, -1);
  });
  repeat(actions.right.pulses, () => {
    horizontal(draft, 1);
  });
  if (actions.confirm.wasPressed) {
    const widget = focusedWidget(draft);
    emitIfAny(draft, widget === undefined ? undefined : confirmIntent(widget));
  }
  if (actions.back.wasPressed) {
    emit(draft, { kind: 'back' });
  }
  typed(draft, frame.typedChars);
}
