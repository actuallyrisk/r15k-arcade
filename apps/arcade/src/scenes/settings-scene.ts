import { intersectRects } from '@r15k/engine';
import type {
  A11yEvent,
  A11yNode,
  DrawTarget,
  FrameContext,
  InputDevice,
  Layout,
  Rect,
  RenderContext,
  Scene,
} from '@r15k/engine';
import {
  createMenuState,
  drawGridPaper,
  drawLabel,
  layoutMenuColumn,
  menuA11yNodes,
  replaceWidgets,
  UI_THEME,
} from '@r15k/ui';
import type { ButtonWidget, MenuColumnLayout, MenuState, Widget, WidgetIntent } from '@r15k/ui';
import type { AppServices } from '../boot/app-services.ts';
import { applySettingsIntent, buildSettingsWidgets } from '../settings/settings-model.ts';
import { SETTINGS_ROW_IDS } from '../settings/settings-rows.ts';
import { drawMenuWidgets, firstAction, playMenuSounds, stepMenu } from './menu-support.ts';
import { defineScene } from './scene-base.ts';
import { SCENE_IDS } from './scene-ids.ts';
import { computeSettingsFrame, SETTINGS_ROW_GAP, settingsRowHeights } from './settings-frame.ts';
import type { SettingsFrame } from './settings-frame.ts';
import { capHeightOf } from './text-support.ts';

/** Mirror ids of the tappable ↑/↓ more-indicators. */
const MORE_ABOVE_ID = 'more-above';
const MORE_BELOW_ID = 'more-below';
/** Passed as the focus row when the focus did not move, so the column keeps the player's scroll. */
const NO_FOCUS_ROW = -1;
/** Where scrolled-out rows go for the pointer: off the canvas, so they never take a tap. */
const OFF_CANVAS: Rect = { x: -100_000, y: -100_000, width: 1, height: 1 };
/** Index of the version footer in the column (after the rows). */
const FOOTER_INDEX = SETTINGS_ROW_IDS.length;

/** Everything the settings screen keeps between frames. */
interface SettingsState {
  menu: MenuState | undefined;
  scrollOffset: number;
  lastDevice: InputDevice;
  lastLayout: Layout | undefined;
}

/** One laid-out frame of the settings screen. */
interface SettingsView {
  readonly frame: SettingsFrame;
  readonly column: MenuColumnLayout;
  /** Back first, then the rows, all at their real rects (drawing and mirror). */
  readonly widgets: readonly Widget[];
}

/** The Back button of the title bar. */
function backButton(services: AppServices, frame: SettingsFrame): ButtonWidget {
  return {
    kind: 'button',
    id: 'back',
    rect: frame.back,
    label: services.i18n().t('arcade.settings.back'),
    isDisabled: false,
    variant: 'icon',
    icon: 'back',
  };
}

/** Lays the settings out for a focus row and the kept scroll offset (which it clamps). */
function layoutView(
  services: AppServices,
  state: SettingsState,
  context: { readonly layout: Layout; readonly focusRow: number },
): SettingsView {
  const { layout } = context;
  const i18n = services.i18n();
  const frame = computeSettingsFrame(layout, i18n.t('arcade.settings.title'));
  const settings = services.settings().raw;
  const probe = SETTINGS_ROW_IDS.map(() => ({ ...frame.column, y: 0, height: 1 }));
  const rowHeights = settingsRowHeights(
    layout,
    buildSettingsWidgets(settings, { i18n, rects: probe }),
  );
  const column = layoutMenuColumn({
    region: frame.scrollRegion,
    rowHeights,
    rowGap: SETTINGS_ROW_GAP,
    focusIndex: context.focusRow,
    scrollOffset: state.scrollOffset,
    minTouchTarget: layout.minTouchTarget,
  });
  state.scrollOffset = column.scrollOffset;
  const rows = buildSettingsWidgets(settings, { i18n, rects: column.rects });
  return { frame, column, widgets: [backButton(services, frame), ...rows] };
}

/** Whether a widget of the view is a row scrolled out of the region (Back never is). */
function isScrolledOut(view: SettingsView, index: number): boolean {
  return index > 0 && view.column.visible[index - 1] !== true;
}

/** Updates the menu to the view; the pointer sees scrolled-out rows off the canvas. */
function syncMenu(state: SettingsState, view: SettingsView): MenuState {
  const widgets = view.widgets.map((widget, index) =>
    isScrolledOut(view, index) ? { ...widget, rect: OFF_CANVAS } : widget,
  );
  state.menu =
    state.menu === undefined
      ? createMenuState(widgets, { focusId: 'music', navigation: 'vertical' })
      : replaceWidgets(state.menu, widgets);
  return state.menu;
}

/** The view of a frame without input (render and mirror between updates). */
function currentView(services: AppServices, state: SettingsState, layout: Layout): SettingsView {
  const focusRow = state.menu === undefined ? 0 : NO_FOCUS_ROW;
  const view = layoutView(services, state, { layout, focusRow });
  syncMenu(state, view);
  return view;
}

/** Scrolls one row for each mirror activation of a more-indicator; returns the other events. */
function applyIndicatorEvents(
  state: SettingsState,
  context: { readonly view: SettingsView; readonly events: readonly A11yEvent[] },
): readonly A11yEvent[] {
  const rowStep = (context.view.column.rects[0]?.height ?? 0) + SETTINGS_ROW_GAP;
  return context.events.filter((event) => {
    if (event.kind !== 'activate' || (event.id !== MORE_ABOVE_ID && event.id !== MORE_BELOW_ID)) {
      return true;
    }
    state.scrollOffset += event.id === MORE_ABOVE_ID ? -rowStep : rowStep;
    return false;
  });
}

/** Whether an intent leaves the settings (Back button or the back action). */
function isBackIntent(intent: WidgetIntent): true | undefined {
  const isBack = intent.kind === 'back' || (intent.kind === 'activate' && intent.id === 'back');
  return isBack ? true : undefined;
}

/** One frame of input: changes are saved and applied at once; Back leaves (one navigation call). */
function updateSettingsScene(
  services: AppServices,
  state: SettingsState,
  frame: FrameContext,
): void {
  state.lastDevice = frame.input.lastDevice;
  state.lastLayout = frame.layout;
  const view = currentView(services, state, frame.layout);
  const a11yEvents = applyIndicatorEvents(state, { view, events: frame.a11yEvents });
  const previousFocus = state.menu?.focusId;
  const step = stepMenu(
    syncMenu(state, view),
    { ...frame, a11yEvents },
    {
      scrollRegion: view.frame.scrollRegion,
      moreIndicators: { above: view.column.moreAbove, below: view.column.moreBelow },
    },
  );
  state.menu = step.state;
  state.scrollOffset += step.scrollBy;
  playMenuSounds(services.mixer, step.sounds);
  for (const intent of step.intents) {
    services.updateSettings((settings) => applySettingsIntent(settings, intent));
  }
  const focusId = step.state.focusId;
  const focusRow =
    focusId === previousFocus ? NO_FOCUS_ROW : SETTINGS_ROW_IDS.findIndex((id) => id === focusId);
  syncMenu(state, layoutView(services, state, { layout: frame.layout, focusRow }));
  if (firstAction(step.intents, isBackIntent) === true) {
    services.navigation.back();
  }
}

/** Draws a muted text centred in a rect. */
function drawCentred(
  target: DrawTarget,
  text: string,
  context: { readonly rect: Rect; readonly layout: Layout },
): void {
  const { rect, layout } = context;
  drawLabel(target, text, {
    style: layout.menuText,
    slot: UI_THEME.textMuted,
    x: rect.x + Math.floor(rect.width / 2),
    y: rect.y + Math.floor((rect.height - capHeightOf(layout.menuText)) / 2),
    align: 'center',
  });
}

/** Draws the version footer and the ↑/↓ indicators. */
function drawScrollParts(
  services: AppServices,
  target: DrawTarget,
  context: { readonly view: SettingsView; readonly layout: Layout },
): void {
  const { column } = context.view;
  const i18n = services.i18n();
  const footer = column.rects[FOOTER_INDEX];
  if (footer !== undefined && column.visible[FOOTER_INDEX] === true) {
    const version = i18n.t('arcade.settings.version', { version: services.appVersion });
    drawCentred(target, version, { rect: footer, layout: context.layout });
  }
  if (column.moreAbove !== undefined) {
    drawCentred(target, i18n.t('ui.menu.moreAbove'), {
      rect: column.moreAbove,
      layout: context.layout,
    });
  }
  if (column.moreBelow !== undefined) {
    drawCentred(target, i18n.t('ui.menu.moreBelow'), {
      rect: column.moreBelow,
      layout: context.layout,
    });
  }
}

/** Draws the title bar, the visible rows (clipped to the scroll region) and the scroll parts. */
function renderSettings(services: AppServices, state: SettingsState, context: RenderContext): void {
  const { target, layout } = context;
  state.lastLayout = layout;
  const view = currentView(services, state, layout);
  const menu = { ...(state.menu ?? createMenuState(view.widgets)), widgets: view.widgets };
  drawGridPaper(target, { x: 0, y: 0, ...layout.logical });
  drawLabel(target, services.i18n().t('arcade.settings.title'), {
    style: view.frame.titleStyle,
    slot: UI_THEME.text,
    ...view.frame.title,
    align: 'center',
  });
  const options = { text: layout.menuText, lastDevice: state.lastDevice };
  const rowIds = new Set<string>(SETTINGS_ROW_IDS);
  drawMenuWidgets(target, menu, { ...options, skip: rowIds });
  const hidden = view.widgets.filter((_widget, index) => index === 0 || isScrolledOut(view, index));
  const clip = intersectRects(target.clip, view.frame.scrollRegion);
  drawMenuWidgets({ ...target, clip }, menu, {
    ...options,
    skip: new Set(hidden.map((widget) => widget.id)),
  });
  drawScrollParts(services, target, { view, layout });
}

/** The mirror nodes: title, Back, every row (scrolled-out rows at the region edge), the indicators. */
function settingsNodes(
  services: AppServices,
  state: SettingsState,
  layout: Layout,
): readonly A11yNode[] {
  const view = currentView(services, state, layout);
  const i18n = services.i18n();
  const menu = { ...(state.menu ?? createMenuState(view.widgets)), widgets: view.widgets };
  const indicator = (id: string, key: string, rect: Rect | undefined): readonly A11yNode[] =>
    rect === undefined ? [] : [{ kind: 'button', id, rect, label: i18n.t(key), isDisabled: false }];
  const title = i18n.t('arcade.settings.title');
  return [
    { kind: 'heading', id: 'title', level: 2, rect: view.frame.titleRect, label: title },
    ...menuA11yNodes(menu, { minTouchTarget: layout.minTouchTarget, initialsLetter: () => '' }),
    ...indicator(MORE_ABOVE_ID, 'ui.menu.scrollUp', view.column.moreAbove),
    ...indicator(MORE_BELOW_ID, 'ui.menu.scrollDown', view.column.moreBelow),
  ];
}

/** The settings: fixed title bar with Back, scrolling rows, version footer. */
export function createSettingsScene(services: AppServices): Scene {
  const state: SettingsState = {
    menu: undefined,
    scrollOffset: 0,
    lastDevice: 'keyboard',
    lastLayout: undefined,
  };
  return defineScene({
    id: SCENE_IDS.settings,
    update: (frame) => {
      updateSettingsScene(services, state, frame);
    },
    render: (context) => {
      renderSettings(services, state, context);
    },
    a11y: () => ({
      title: services.i18n().t('arcade.settings.title'),
      nodes: state.lastLayout === undefined ? [] : settingsNodes(services, state, state.lastLayout),
      focusId: state.menu?.focusId,
    }),
  });
}
