import type { UiSound, Widget, WidgetIntent } from '../widgets/widget-types.ts';
import type { MenuNavigation, MenuPress, MenuState, MenuStep } from './menu-reducer.ts';

// The working copy of one reducer step. Intents are applied to the copied widgets right away, so later
// input of the same frame (a second typed letter, a key after a drag) builds on the new values.

/** Mutable state of one reducer step. */
export interface MenuDraft {
  widgets: readonly Widget[];
  focusId: string | undefined;
  readonly navigation: MenuNavigation;
  press: MenuPress | undefined;
  readonly intents: WidgetIntent[];
  readonly sounds: UiSound[];
  scrollBy: number;
}

/** A draft of a menu state with no intents yet. */
export function startDraft(state: MenuState): MenuDraft {
  return {
    widgets: state.widgets,
    focusId: state.focusId,
    navigation: state.navigation,
    press: state.press,
    intents: [],
    sounds: [],
    scrollBy: 0,
  };
}

/** The step a draft describes. */
export function finishDraft(draft: MenuDraft): MenuStep {
  return {
    state: {
      widgets: draft.widgets,
      focusId: draft.focusId,
      navigation: draft.navigation,
      press: draft.press,
    },
    intents: draft.intents,
    sounds: draft.sounds,
    scrollBy: draft.scrollBy,
  };
}

/** The sound of an intent: back for back, move for value and letter changes, confirm otherwise. */
export function soundOf(intent: WidgetIntent): UiSound {
  switch (intent.kind) {
    case 'back':
      return 'back';
    case 'change':
      return 'move';
    case 'initials':
      return intent.isComplete ? 'confirm' : 'move';
    case 'activate':
    case 'toggle':
    case 'select':
      return 'confirm';
  }
}

/** A widget with the value an intent describes (activate and back change nothing). */
function withValue(widget: Widget, intent: WidgetIntent): Widget {
  switch (widget.kind) {
    case 'toggle':
      return intent.kind === 'toggle' ? { ...widget, isOn: intent.isOn } : widget;
    case 'slider':
      return intent.kind === 'change' ? { ...widget, value: intent.value } : widget;
    case 'selector':
      return intent.kind === 'select' ? { ...widget, selectedId: intent.optionId } : widget;
    case 'initials':
      return intent.kind === 'initials'
        ? { ...widget, letters: intent.letters, cursor: intent.cursor }
        : widget;
    case 'button':
      return widget;
  }
}

/** A widget with an intent applied when the intent names it. */
function applied(widget: Widget, intent: WidgetIntent): Widget {
  return intent.kind !== 'back' && widget.id === intent.id ? withValue(widget, intent) : widget;
}

/** Records an intent (with its sound unless `hasSound` is false) and applies it to the widgets. */
export function emit(draft: MenuDraft, intent: WidgetIntent, hasSound = true): void {
  draft.intents.push(intent);
  if (hasSound) {
    draft.sounds.push(soundOf(intent));
  }
  draft.widgets = draft.widgets.map((widget) => applied(widget, intent));
}

/** The widget with an id. */
export function widgetById(
  draft: { readonly widgets: readonly Widget[] },
  id: string | undefined,
): Widget | undefined {
  return id === undefined ? undefined : draft.widgets.find((widget) => widget.id === id);
}

/** The focused widget, if it exists and is enabled. */
export function focusedWidget(draft: MenuDraft): Widget | undefined {
  const widget = widgetById(draft, draft.focusId);
  return widget?.isDisabled === true ? undefined : widget;
}

/** Moves the focus to an id; a change of focus plays `move`. */
export function moveFocus(draft: MenuDraft, id: string | undefined): void {
  if (id === undefined || id === draft.focusId) {
    return;
  }
  draft.focusId = id;
  draft.sounds.push('move');
}
