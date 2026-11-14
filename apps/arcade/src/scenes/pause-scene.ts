import type {
  A11yNode,
  FrameContext,
  InputDevice,
  Layout,
  RenderContext,
  Scene,
} from '@r15k/engine';
import {
  createMenuState,
  drawPanel,
  menuA11yNodes,
  promptGlyph,
  replaceWidgets,
  rowHeightFor,
  scaledChoice,
  UI_THEME,
  wrapLabel,
} from '@r15k/ui';
import type { ButtonWidget, MenuState, WidgetIntent } from '@r15k/ui';
import type { AppServices } from '../boot/app-services.ts';
import { drawMenuWidgets, firstAction, playMenuSounds, stepMenu } from './menu-support.ts';
import {
  drawPanelLines,
  firstFitting,
  layoutPanel,
  lineNode,
  overlayRegion,
  panelInnerWidth,
  panelWidth,
  textItems,
} from './panel-support.ts';
import type { PanelItem, PanelPlan } from './panel-support.ts';
import { defineScene } from './scene-base.ts';
import { SCENE_IDS } from './scene-ids.ts';

/** Widest pause panel (logical px). */
const PANEL_MAX_WIDTH = 208;

/** What the pause overlay does with this frame's input. */
type PauseAction = 'resume' | 'quit';

/** The panel of the pause overlay: title, Resume and Quit, and the key hint (not on touch). */
function pausePlan(
  services: AppServices,
  context: { readonly layout: Layout; readonly device: InputDevice },
): PanelPlan {
  const { layout, device } = context;
  const i18n = services.i18n();
  const region = overlayRegion(layout);
  const width = panelWidth(region, PANEL_MAX_WIDTH);
  const title: PanelItem = {
    kind: 'text',
    line: {
      text: i18n.t('arcade.pause.title'),
      style: scaledChoice(layout.menuText, 2),
      slot: UI_THEME.text,
    },
  };
  const hint = i18n.t('arcade.pause.hint', {
    pause: promptGlyph('pause', device),
    back: promptGlyph('back', device),
  });
  const hintLines =
    device === 'touch'
      ? []
      : wrapLabel(hint, { style: layout.menuText, maxWidth: panelInnerWidth(width) });
  const hintItems = textItems(hintLines, { style: layout.menuText, slot: UI_THEME.textMuted });
  const one: PanelItem = { kind: 'buttons', count: 1 };
  const buttonHeight = rowHeightFor(layout.menuText, layout.minTouchTarget, 1);
  const items = firstFitting(
    [
      [title, one, one, ...hintItems],
      [title, one, one],
      [title, { kind: 'buttons', count: 2 }],
    ],
    { region, buttonHeight },
  );
  return layoutPanel(region, { width, items, buttonHeight });
}

/** Resume (primary) and Quit (secondary) at the plan's button rects. */
function pauseWidgets(services: AppServices, plan: PanelPlan): readonly ButtonWidget[] {
  const i18n = services.i18n();
  const button = (id: string, index: number): ButtonWidget => ({
    kind: 'button',
    id,
    rect: plan.buttons[index] ?? plan.panel,
    label: i18n.t(`arcade.pause.${id}`),
    isDisabled: false,
    variant: index === 0 ? 'primary' : 'secondary',
    icon: undefined,
  });
  return [button('resume', 0), button('quit', 1)];
}

/** The pause action of an intent: Resume and back resume, Quit quits. */
function pauseAction(intent: WidgetIntent): PauseAction | undefined {
  if (intent.kind === 'back') {
    return 'resume';
  }
  if (intent.kind !== 'activate') {
    return undefined;
  }
  return intent.id === 'resume' || intent.id === 'quit' ? intent.id : undefined;
}

/** State of the pause overlay between frames. */
interface PauseState {
  menu: MenuState | undefined;
  lastDevice: InputDevice;
  lastLayout: Layout | undefined;
}

/** The plan and the synced menu for a layout. */
function syncPause(
  services: AppServices,
  state: PauseState,
  layout: Layout,
): { readonly plan: PanelPlan; readonly menu: MenuState } {
  state.lastLayout = layout;
  const plan = pausePlan(services, { layout, device: state.lastDevice });
  const widgets = pauseWidgets(services, plan);
  state.menu =
    state.menu === undefined
      ? createMenuState(widgets, { focusId: 'resume', navigation: 'vertical' })
      : replaceWidgets(state.menu, widgets);
  return { plan, menu: state.menu };
}

/** One frame: the pause key, Resume or back resume, Quit goes to the hub (one navigation call). */
function updatePause(services: AppServices, state: PauseState, frame: FrameContext): void {
  state.lastDevice = frame.input.lastDevice;
  const step = stepMenu(syncPause(services, state, frame.layout).menu, frame);
  state.menu = step.state;
  playMenuSounds(services.mixer, step.sounds);
  const action = frame.input.actions.pause.wasPressed
    ? 'resume'
    : firstAction(step.intents, pauseAction);
  if (action === 'resume') {
    services.navigation.resumeRound();
  } else if (action === 'quit') {
    services.navigation.toHub();
  }
}

/** Draws the panel over the frozen round. */
function renderPause(services: AppServices, state: PauseState, context: RenderContext): void {
  const { plan, menu } = syncPause(services, state, context.layout);
  drawPanel(context.target, plan.panel);
  drawPanelLines(context.target, plan);
  drawMenuWidgets(context.target, menu, {
    text: context.layout.menuText,
    lastDevice: state.lastDevice,
  });
}

/** The mirror nodes: the title and the two buttons. */
function pauseNodes(services: AppServices, state: PauseState, layout: Layout): readonly A11yNode[] {
  const { plan, menu } = syncPause(services, state, layout);
  const label = services.i18n().t('arcade.pause.title');
  const heading = lineNode(plan, { index: 0, id: 'title', label, kind: 'heading' });
  return [
    ...heading,
    ...menuA11yNodes(menu, { minTouchTarget: layout.minTouchTarget, initialsLetter: () => '' }),
  ];
}

/** The pause overlay; resume and quit go through services.navigation. */
export function createPauseScene(services: AppServices): Scene {
  const state: PauseState = { menu: undefined, lastDevice: 'keyboard', lastLayout: undefined };
  return defineScene({
    id: SCENE_IDS.pause,
    isOverlay: true,
    update: (frame) => {
      updatePause(services, state, frame);
    },
    render: (context) => {
      renderPause(services, state, context);
    },
    a11y: () => ({
      title: services.i18n().t('arcade.pause.title'),
      nodes: state.lastLayout === undefined ? [] : pauseNodes(services, state, state.lastLayout),
      focusId: state.menu?.focusId,
    }),
  });
}
