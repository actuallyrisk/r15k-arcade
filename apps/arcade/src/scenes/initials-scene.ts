import { contentRegions } from '@r15k/engine';
import type {
  A11yNode,
  FrameContext,
  InputDevice,
  Layout,
  RenderContext,
  RoundResult,
  Scene,
} from '@r15k/engine';
import {
  createMenuState,
  drawGridPaper,
  drawPanel,
  INITIALS_LENGTH,
  initialsSize,
  menuA11yNodes,
  replaceWidgets,
  rowHeightFor,
  UI_THEME,
} from '@r15k/ui';
import type { ButtonWidget, InitialsWidget, MenuState, Widget, WidgetIntent } from '@r15k/ui';
import type { AppServices } from '../boot/app-services.ts';
import { drawMenuWidgets, playMenuSounds, stepMenu } from './menu-support.ts';
import { drawPanelLines, layoutPanel, lineNode, panelWidth } from './panel-support.ts';
import type { PanelItem, PanelPlan } from './panel-support.ts';
import { defineScene } from './scene-base.ts';
import { SCENE_IDS } from './scene-ids.ts';
import { fittingStyle } from './text-support.ts';

/** The qualifying round and its rank. */
export interface InitialsSceneOptions {
  readonly result: RoundResult;
  /** 1…10. */
  readonly rank: number;
}

/** Widest initials panel (logical px). */
const PANEL_MAX_WIDTH = 240;
/** Padding of the panel (both sides) the title must fit within. */
const PANEL_TEXT_MARGIN = 16;

/** The letters being entered and the cursor box. */
interface Entry {
  readonly letters: string;
  readonly cursor: number;
}

/** State of the initials screen between frames. */
interface InitialsState {
  entry: Entry;
  menu: MenuState | undefined;
  lastDevice: InputDevice;
  lastLayout: Layout | undefined;
  isDone: boolean;
}

/** The panel: title, rank, the three letter boxes and OK, centred in the interaction region. */
function initialsPlan(
  services: AppServices,
  context: { readonly layout: Layout; readonly rank: number },
): PanelPlan {
  const { layout } = context;
  const i18n = services.i18n();
  const region = contentRegions(layout).interaction;
  const size = initialsSize(layout.minTouchTarget, layout.menuText);
  const width = panelWidth(region, Math.max(PANEL_MAX_WIDTH, size.width + PANEL_TEXT_MARGIN));
  const titleText = i18n.t('arcade.initials.title');
  const titleStyle = fittingStyle(titleText, layout.menuText, {
    factors: [2],
    maxWidth: width - PANEL_TEXT_MARGIN,
  });
  const items: readonly PanelItem[] = [
    { kind: 'text', line: { text: titleText, style: titleStyle, slot: UI_THEME.text } },
    {
      kind: 'text',
      line: {
        text: i18n.t('arcade.initials.rank', { rank: context.rank }),
        style: layout.menuText,
        slot: UI_THEME.textAccent,
      },
    },
    { kind: 'block', ...size },
    { kind: 'buttons', count: 1 },
  ];
  const buttonHeight = rowHeightFor(layout.menuText, layout.minTouchTarget, 1);
  return layoutPanel(region, { width, items, buttonHeight });
}

/** The initials widget and the OK button at the plan's rects. */
function initialsWidgets(
  services: AppServices,
  context: { readonly plan: PanelPlan; readonly entry: Entry },
): readonly Widget[] {
  const { plan, entry } = context;
  const i18n = services.i18n();
  const initials: InitialsWidget = {
    kind: 'initials',
    id: 'initials',
    rect: plan.blocks[0] ?? plan.panel,
    label: i18n.t('arcade.initials.label'),
    isDisabled: false,
    letters: entry.letters,
    cursor: entry.cursor,
  };
  const ok: ButtonWidget = {
    kind: 'button',
    id: 'ok',
    rect: plan.buttons[0] ?? plan.panel,
    label: i18n.t('arcade.initials.confirm'),
    isDisabled: false,
    variant: 'primary',
    icon: undefined,
  };
  return [initials, ok];
}

/** The plan and the synced menu for a layout. */
function syncInitials(
  services: AppServices,
  state: InitialsState,
  context: { readonly layout: Layout; readonly rank: number },
): { readonly plan: PanelPlan; readonly menu: MenuState } {
  state.lastLayout = context.layout;
  const plan = initialsPlan(services, context);
  const widgets = initialsWidgets(services, { plan, entry: state.entry });
  state.menu =
    state.menu === undefined
      ? createMenuState(widgets, { focusId: 'initials', navigation: 'vertical' })
      : replaceWidgets(state.menu, widgets);
  return { plan, menu: state.menu };
}

/** Applies the intents of a frame: letter changes, completion or OK submit, back leaves unsaved. */
function applyInitialsIntents(
  services: AppServices,
  state: InitialsState,
  context: { readonly intents: readonly WidgetIntent[]; readonly options: InitialsSceneOptions },
): void {
  for (const intent of context.intents) {
    if (state.isDone) {
      return;
    }
    if (intent.kind === 'initials') {
      state.entry = { letters: intent.letters, cursor: intent.cursor };
    }
    const isSubmit =
      (intent.kind === 'initials' && intent.isComplete) ||
      (intent.kind === 'activate' && intent.id === 'ok');
    if (isSubmit) {
      state.isDone = true;
      services.navigation.submitInitials(context.options.result, state.entry.letters);
    } else if (intent.kind === 'back') {
      state.isDone = true;
      services.navigation.back();
    }
  }
}

/** One frame of the initials screen. */
function updateInitials(
  services: AppServices,
  state: InitialsState,
  context: { readonly frame: FrameContext; readonly options: InitialsSceneOptions },
): void {
  const { frame, options } = context;
  state.lastDevice = frame.input.lastDevice;
  const step = stepMenu(
    syncInitials(services, state, { layout: frame.layout, rank: options.rank }).menu,
    frame,
  );
  state.menu = step.state;
  // The reducer keeps the letters and the cursor in its widget (mirror focus moves the cursor too).
  const widget = step.state.widgets.find((candidate) => candidate.kind === 'initials');
  if (widget?.kind === 'initials') {
    state.entry = { letters: widget.letters, cursor: widget.cursor };
  }
  playMenuSounds(services.mixer, step.sounds);
  applyInitialsIntents(services, state, { intents: step.intents, options });
}

/** The mirror nodes: title, rank, the three letter sliders and OK. */
function initialsNodes(
  services: AppServices,
  state: InitialsState,
  context: { readonly layout: Layout; readonly rank: number },
): readonly A11yNode[] {
  const { plan, menu } = syncInitials(services, state, context);
  const i18n = services.i18n();
  const letter = (index: number): string =>
    i18n.t('ui.initials.letter', { index: index + 1, count: INITIALS_LENGTH });
  return [
    ...lineNode(plan, {
      index: 0,
      id: 'title',
      label: i18n.t('arcade.initials.title'),
      kind: 'heading',
    }),
    ...lineNode(plan, {
      index: 1,
      id: 'rank',
      label: i18n.t('arcade.a11y.rank', { rank: context.rank }),
      kind: 'text',
    }),
    ...menuA11yNodes(menu, {
      minTouchTarget: context.layout.minTouchTarget,
      initialsLetter: letter,
    }),
  ];
}

/** The mirror focus: the letter slider under the cursor while the initials have the focus. */
function mirrorFocus(state: InitialsState): string | undefined {
  const focusId = state.menu?.focusId;
  return focusId === 'initials' ? `initials.${state.entry.cursor}` : focusId;
}

/** Draws grid paper and the panel with the letter boxes and OK. */
function renderInitials(
  services: AppServices,
  state: InitialsState,
  context: { readonly render: RenderContext; readonly rank: number },
): void {
  const { target, layout } = context.render;
  const { plan, menu } = syncInitials(services, state, { layout, rank: context.rank });
  drawGridPaper(target, { x: 0, y: 0, ...layout.logical });
  drawPanel(target, plan.panel);
  drawPanelLines(target, plan);
  drawMenuWidgets(target, menu, { text: layout.menuText, lastDevice: state.lastDevice });
}

/** Three-initials entry for a new top-10 score. */
export function createInitialsScene(services: AppServices, options: InitialsSceneOptions): Scene {
  const letters = services.save.get().meta.lastInitials;
  const state: InitialsState = {
    entry: { letters, cursor: 0 },
    menu: undefined,
    lastDevice: 'keyboard',
    lastLayout: undefined,
    isDone: false,
  };
  const sizing = (layout: Layout): { readonly layout: Layout; readonly rank: number } => ({
    layout,
    rank: options.rank,
  });
  return defineScene({
    id: SCENE_IDS.initials,
    enter: () => {
      services.input.setTextEntry(true);
    },
    exit: () => {
      services.input.setTextEntry(false);
    },
    update: (frame) => {
      updateInitials(services, state, { frame, options });
    },
    render: (context: RenderContext) => {
      renderInitials(services, state, { render: context, rank: options.rank });
    },
    a11y: () => ({
      title: services.i18n().t('arcade.initials.title'),
      nodes:
        state.lastLayout === undefined
          ? []
          : initialsNodes(services, state, sizing(state.lastLayout)),
      focusId: mirrorFocus(state),
    }),
  });
}
