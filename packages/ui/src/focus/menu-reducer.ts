import { clamp } from '@r15k/engine';
import type { A11yEvent, InputFrame, Rect, TextChoice } from '@r15k/engine';
import { ALPHABET, LETTER_COUNT, withLetter } from '../widgets/initials-layout.ts';
import type { InitialsWidget, UiSound, Widget, WidgetIntent } from '../widgets/widget-types.ts';
import { nextFocusable } from './focus-order.ts';
import { confirmIntent, sliderTo } from './menu-actions.ts';
import { emit, finishDraft, moveFocus, startDraft, widgetById } from './menu-draft.ts';
import type { MenuDraft } from './menu-draft.ts';
import { BACKGROUND_ID, MORE_ABOVE_ID, MORE_BELOW_ID } from './menu-hits.ts';
import { applyKeys } from './menu-keys.ts';
import { applyPointer } from './menu-pointer-steps.ts';

/** Which arrow keys move the focus. */
export type MenuNavigation = 'vertical' | 'horizontal';

/** State of a menu: its widgets, the focus and the current pointer press. */
export interface MenuState {
  readonly widgets: readonly Widget[];
  readonly focusId: string | undefined;
  readonly navigation: MenuNavigation;
  /** The widget hit at pointer-down, until pointer-up. */
  readonly press: MenuPress | undefined;
}

/** A pointer press on a menu. */
export interface MenuPress {
  readonly widgetId: string;
  readonly pointerId: number;
  readonly isScrollDrag: boolean;
  readonly lastY: number;
}

/** Result of one reducer step. */
export interface MenuStep {
  readonly state: MenuState;
  readonly intents: readonly WidgetIntent[];
  readonly sounds: readonly UiSound[];
  /** Logical px from wheel and drag inside the scroll region (the scene applies it). */
  readonly scrollBy: number;
}

/** Everything the reducer needs from the frame and the layout. */
export interface MenuInput {
  readonly frame: InputFrame;
  readonly minTouchTarget: number;
  readonly text: TextChoice;
  readonly cssPerLogical: number;
  readonly scrollRegion: Rect | undefined;
  /** From MenuColumnLayout. */
  readonly moreIndicators: { readonly above: Rect | undefined; readonly below: Rect | undefined };
}

/** Press ids that name no widget (more-indicators and the scroll region background). */
const SYNTHETIC_PRESS_IDS: readonly string[] = [MORE_ABOVE_ID, MORE_BELOW_ID, BACKGROUND_ID];

/** Whether an id names an enabled widget. */
function isFocusable(widgets: readonly Widget[], id: string | undefined): boolean {
  return widgets.some((widget) => widget.id === id && !widget.isDisabled);
}

/** Creates a menu state; the focus defaults to the first focusable widget. */
export function createMenuState(
  widgets: readonly Widget[],
  options?: { readonly focusId?: string; readonly navigation?: MenuNavigation },
): MenuState {
  const requested = options?.focusId;
  return {
    widgets,
    focusId: isFocusable(widgets, requested) ? requested : nextFocusable(widgets, undefined, 1),
    navigation: options?.navigation ?? 'vertical',
    press: undefined,
  };
}

/**
 * Applies one frame of input to a menu: navigation pulses (up, down, left, right), confirm, back, typed
 * characters, then pointer press/drag/release, then the wheel. The returned state already carries the
 * widget values the intents describe.
 */
export function reduceMenu(state: MenuState, input: MenuInput): MenuStep {
  const draft = startDraft(state);
  applyKeys(draft, input.frame);
  applyPointer(draft, input);
  return finishDraft(draft);
}

/** An initials letter node id `<id>.<index>`, split into the widget and the letter index. */
function letterNode(
  draft: MenuDraft,
  id: string,
): { readonly widget: InitialsWidget; readonly index: number } | undefined {
  const dot = id.lastIndexOf('.');
  const widget = dot === -1 ? undefined : widgetById(draft, id.slice(0, dot));
  const index = Number(id.slice(dot + 1));
  const isLetter = Number.isInteger(index) && index >= 0 && index < LETTER_COUNT;
  if (widget?.kind !== 'initials' || !isLetter) {
    return undefined;
  }
  return { widget, index };
}

/** A mirror event on one of the three initials letter sliders. */
function applyLetterEvent(draft: MenuDraft, event: A11yEvent): void {
  const node = letterNode(draft, event.id);
  if (node?.widget.isDisabled !== false) {
    return;
  }
  const { widget, index } = node;
  moveFocus(draft, widget.id);
  const letters =
    event.kind === 'value'
      ? withLetter(
          widget.letters,
          index,
          ALPHABET.charAt(clamp(Math.round(event.value), 0, ALPHABET.length - 1)),
        )
      : widget.letters;
  if (letters !== widget.letters || index !== widget.cursor) {
    emit(draft, { kind: 'initials', id: widget.id, letters, cursor: index, isComplete: false });
  }
}

/** The intent of a mirror event on a widget. */
function eventIntent(widget: Widget, event: A11yEvent): WidgetIntent | undefined {
  switch (event.kind) {
    case 'activate':
      return confirmIntent(widget);
    case 'value':
      return widget.kind === 'slider' ? sliderTo(widget, event.value) : undefined;
    case 'select':
      return widget.kind === 'selector' &&
        widget.options.some((option) => option.id === event.optionId)
        ? { kind: 'select', id: widget.id, optionId: event.optionId }
        : undefined;
    case 'focus':
      return undefined;
  }
}

/**
 * Applies one accessibility mirror event: focus sets the focus, activate acts like confirm on that
 * widget, value changes a slider (stepped, clamped) or an initials letter (`<id>.0…2`, alphabet index),
 * select picks a selector option.
 */
export function applyA11yEvent(state: MenuState, event: A11yEvent): MenuStep {
  const draft = startDraft(state);
  const widget = widgetById(draft, event.id);
  if (widget === undefined) {
    applyLetterEvent(draft, event);
    return finishDraft(draft);
  }
  if (widget.isDisabled) {
    return finishDraft(draft);
  }
  moveFocus(draft, widget.id);
  const intent = eventIntent(widget, event);
  if (intent !== undefined) {
    emit(draft, intent);
  }
  return finishDraft(draft);
}

/** Replaces the widgets and keeps the focus if its id is still present (else the first focusable). */
export function replaceWidgets(state: MenuState, widgets: readonly Widget[]): MenuState {
  const pressId = state.press?.widgetId;
  const isPressKept =
    pressId !== undefined &&
    (SYNTHETIC_PRESS_IDS.includes(pressId) || widgets.some((widget) => widget.id === pressId));
  return {
    widgets,
    focusId: isFocusable(widgets, state.focusId)
      ? state.focusId
      : nextFocusable(widgets, undefined, 1),
    navigation: state.navigation,
    press: isPressKept ? state.press : undefined,
  };
}
