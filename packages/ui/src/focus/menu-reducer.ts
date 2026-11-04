import { notImplemented } from '@r15k/engine';
import type { A11yEvent, InputFrame, Rect, TextChoice } from '@r15k/engine';
import type { UiSound, Widget, WidgetIntent } from '../widgets/widget-types.ts';

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

/** Creates a menu state; the focus defaults to the first focusable widget. */
export function createMenuState(
  _widgets: readonly Widget[],
  _options?: { readonly focusId?: string; readonly navigation?: MenuNavigation },
): MenuState {
  return notImplemented('ui.createMenuState');
}

/** Applies one frame of input to a menu. */
export function reduceMenu(_state: MenuState, _input: MenuInput): MenuStep {
  return notImplemented('ui.reduceMenu');
}

/** Applies one accessibility mirror event to a menu. */
export function applyA11yEvent(_state: MenuState, _event: A11yEvent): MenuStep {
  return notImplemented('ui.applyA11yEvent');
}

/** Replaces the widgets and keeps the focus if its id is still present. */
export function replaceWidgets(_state: MenuState, _widgets: readonly Widget[]): MenuState {
  return notImplemented('ui.replaceWidgets');
}
