import type {
  AudioPort,
  DrawTarget,
  FrameContext,
  InputDevice,
  Rect,
  TextChoice,
} from '@r15k/engine';
import { applyA11yEvent, drawWidget, reduceMenu, shouldShowFocusRing } from '@r15k/ui';
import type { MenuState, MenuStep, UiSound, WidgetIntent } from '@r15k/ui';
import type { UiSfxId } from '../content/ui-sfx.ts';

/** The SFX of each menu sound. */
const SOUND_SFX: Readonly<Record<UiSound, UiSfxId>> = {
  move: 'ui-move',
  confirm: 'ui-confirm',
  back: 'ui-back',
};

/** Scrolling parts of a menu (only scrolling menus pass them). */
export interface MenuScrollParts {
  readonly scrollRegion: Rect | undefined;
  readonly moreIndicators: { readonly above: Rect | undefined; readonly below: Rect | undefined };
}

/** A menu without a scroll region. */
const NO_SCROLL: MenuScrollParts = {
  scrollRegion: undefined,
  moreIndicators: { above: undefined, below: undefined },
};

/** Joins two reducer steps (the second continues from the first's state). */
function joinSteps(first: MenuStep, second: MenuStep): MenuStep {
  return {
    state: second.state,
    intents: [...first.intents, ...second.intents],
    sounds: [...first.sounds, ...second.sounds],
    scrollBy: first.scrollBy + second.scrollBy,
  };
}

/** One frame of a menu: the frame's mirror events first, then its input. */
export function stepMenu(
  state: MenuState,
  frame: FrameContext,
  scroll: MenuScrollParts = NO_SCROLL,
): MenuStep {
  let step: MenuStep = { state, intents: [], sounds: [], scrollBy: 0 };
  for (const event of frame.a11yEvents) {
    step = joinSteps(step, applyA11yEvent(step.state, event));
  }
  const { layout } = frame;
  return joinSteps(
    step,
    reduceMenu(step.state, {
      frame: frame.input,
      minTouchTarget: layout.minTouchTarget,
      text: layout.menuText,
      cssPerLogical: layout.cssPerLogical,
      ...scroll,
    }),
  );
}

/** Plays each menu sound of a step once. */
export function playMenuSounds(audio: AudioPort, sounds: readonly UiSound[]): void {
  for (const sound of new Set(sounds)) {
    audio.playSfx(SOUND_SFX[sound]);
  }
}

/** The first intent a scene maps to an action (at most one navigation call per frame). */
export function firstAction<T>(
  intents: readonly WidgetIntent[],
  toAction: (intent: WidgetIntent) => T | undefined,
): T | undefined {
  for (const intent of intents) {
    const action = toAction(intent);
    if (action !== undefined) {
      return action;
    }
  }
  return undefined;
}

/** How the widgets of a menu are drawn this frame. */
export interface MenuDrawOptions {
  readonly text: TextChoice;
  readonly lastDevice: InputDevice;
  /** Widgets the scene draws itself (e.g. the hub cabinet) or that are scrolled out. */
  readonly skip?: ReadonlySet<string>;
}

/** Draws every widget of a menu with its focus and press state. */
export function drawMenuWidgets(
  target: DrawTarget,
  state: MenuState,
  options: MenuDrawOptions,
): void {
  const hasFocusRing = shouldShowFocusRing(options.lastDevice);
  const pressedId = state.press?.isScrollDrag === false ? state.press.widgetId : undefined;
  for (const widget of state.widgets) {
    if (options.skip?.has(widget.id) !== true) {
      drawWidget(target, widget, {
        text: options.text,
        isFocused: widget.id === state.focusId,
        hasFocusRing,
        isPressed: widget.id === pressedId,
      });
    }
  }
}
