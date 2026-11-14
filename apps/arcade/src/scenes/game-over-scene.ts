import { SLOT } from '@r15k/engine';
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
  drawPanel,
  menuA11yNodes,
  replaceWidgets,
  rowHeightFor,
  scaledChoice,
  UI_THEME,
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
  panelWidth,
} from './panel-support.ts';
import type { PanelItem, PanelPlan, PanelText } from './panel-support.ts';
import { defineScene } from './scene-base.ts';
import { SCENE_IDS } from './scene-ids.ts';

/** The finished round and the best score before it. */
export interface GameOverSceneOptions {
  readonly result: RoundResult;
  readonly previousBest: number;
}

/** Widest game-over panel (logical px). */
const PANEL_MAX_WIDTH = 208;

/** Whether the round set a new record. */
function isRecord(options: GameOverSceneOptions): boolean {
  return options.result.score > 0 && options.result.score > options.previousBest;
}

/** The text lines of the panel; the score comes in two sizes for small fields. */
function gameOverLines(
  services: AppServices,
  context: { readonly layout: Layout; readonly options: GameOverSceneOptions },
): {
  readonly title: PanelItem;
  readonly score: (factor: 2 | 3) => PanelItem;
  readonly points: PanelItem;
  readonly record: PanelItem;
} {
  const { layout, options } = context;
  const i18n = services.i18n();
  const style = layout.menuText;
  const { score } = options.result;
  const line = (text: string, look: Omit<PanelText, 'text' | 'style'>): PanelItem => ({
    kind: 'text',
    line: { text, style, ...look },
  });
  const best = i18n.t('arcade.gameOver.best', { score: options.previousBest });
  return {
    title: line(i18n.t('bugHunt.result.timeUp'), { slot: UI_THEME.text }),
    score: (factor) => ({
      kind: 'text',
      line: {
        text: i18n.formatInteger(score),
        style: scaledChoice(style, factor),
        slot: UI_THEME.text,
        shadowSlot: SLOT.blue,
      },
    }),
    points: line(i18n.t('bugHunt.result.points', { count: score }), { slot: UI_THEME.text }),
    record: isRecord(options)
      ? line(i18n.t('arcade.gameOver.newRecord'), { slot: UI_THEME.textAccent })
      : line(best, { slot: UI_THEME.textMuted }),
  };
}

/** The panel: TIME'S UP!, the score (× 3, blue shadow), the points line, record or HI, Continue. */
function gameOverPlan(
  services: AppServices,
  context: { readonly layout: Layout; readonly options: GameOverSceneOptions },
): PanelPlan {
  const { layout } = context;
  const { title, score, points, record } = gameOverLines(services, context);
  const button: PanelItem = { kind: 'buttons', count: 1 };
  const region = overlayRegion(layout);
  const buttonHeight = rowHeightFor(layout.menuText, layout.minTouchTarget, 1);
  const items = firstFitting(
    [
      [title, score(3), points, record, button],
      [title, score(2), points, record, button],
      [title, score(2), record, button],
    ],
    { region, buttonHeight },
  );
  return layoutPanel(region, { width: panelWidth(region, PANEL_MAX_WIDTH), items, buttonHeight });
}

/** State of the game-over overlay between frames. */
interface GameOverState {
  menu: MenuState | undefined;
  lastDevice: InputDevice;
  lastLayout: Layout | undefined;
}

/** The plan and the synced menu (one Continue button) for a layout. */
function syncGameOver(
  services: AppServices,
  state: GameOverState,
  context: { readonly layout: Layout; readonly options: GameOverSceneOptions },
): { readonly plan: PanelPlan; readonly menu: MenuState } {
  state.lastLayout = context.layout;
  const plan = gameOverPlan(services, context);
  const button: ButtonWidget = {
    kind: 'button',
    id: 'continue',
    rect: plan.buttons[0] ?? plan.panel,
    label: services.i18n().t('arcade.gameOver.continue'),
    isDisabled: false,
    variant: 'primary',
    icon: undefined,
  };
  state.menu =
    state.menu === undefined
      ? createMenuState([button], { focusId: 'continue', navigation: 'vertical' })
      : replaceWidgets(state.menu, [button]);
  return { plan, menu: state.menu };
}

/** Continue (confirm, release, mirror activation) and back both continue. */
function isContinue(intent: WidgetIntent): true | undefined {
  return intent.kind === 'back' || (intent.kind === 'activate' && intent.id === 'continue')
    ? true
    : undefined;
}

/** The mirror nodes: heading, the score as text and the Continue button. */
function gameOverNodes(
  services: AppServices,
  state: GameOverState,
  context: { readonly layout: Layout; readonly options: GameOverSceneOptions },
): readonly A11yNode[] {
  const { plan, menu } = syncGameOver(services, state, context);
  const i18n = services.i18n();
  const { score } = context.options.result;
  return [
    ...lineNode(plan, {
      index: 0,
      id: 'title',
      label: i18n.t('bugHunt.result.timeUp'),
      kind: 'heading',
    }),
    ...lineNode(plan, {
      index: 1,
      id: 'score',
      label: i18n.t('bugHunt.result.points', { count: score }),
      kind: 'text',
    }),
    ...menuA11yNodes(menu, {
      minTouchTarget: context.layout.minTouchTarget,
      initialsLetter: () => '',
    }),
  ];
}

/** Announces the final score (and a new record) when the overlay appears. */
function announceResult(services: AppServices, options: GameOverSceneOptions): void {
  const i18n = services.i18n();
  const finalScore = i18n.t('arcade.a11y.finalScore', { count: options.result.score });
  const record = isRecord(options) ? ` ${i18n.t('arcade.a11y.newRecord')}` : '';
  services.announce(`${finalScore}${record}`);
}

/** Draws the panel over the frozen round. */
function renderGameOver(
  services: AppServices,
  state: GameOverState,
  context: { readonly render: RenderContext; readonly options: GameOverSceneOptions },
): void {
  const { target, layout } = context.render;
  const { plan, menu } = syncGameOver(services, state, { layout, options: context.options });
  drawPanel(target, plan.panel);
  drawPanelLines(target, plan);
  drawMenuWidgets(target, menu, { text: layout.menuText, lastDevice: state.lastDevice });
}

/** The game-over overlay over the frozen round. */
export function createGameOverScene(services: AppServices, options: GameOverSceneOptions): Scene {
  const state: GameOverState = { menu: undefined, lastDevice: 'keyboard', lastLayout: undefined };
  let isDone = false;
  return defineScene({
    id: SCENE_IDS.gameOver,
    isOverlay: true,
    enter: () => {
      announceResult(services, options);
    },
    update: (frame: FrameContext) => {
      state.lastDevice = frame.input.lastDevice;
      const { menu } = syncGameOver(services, state, { layout: frame.layout, options });
      const step = stepMenu(menu, frame);
      state.menu = step.state;
      playMenuSounds(services.mixer, step.sounds);
      if (!isDone && firstAction(step.intents, isContinue) === true) {
        isDone = true;
        services.navigation.continueAfterGameOver(options.result);
      }
    },
    render: (render) => {
      renderGameOver(services, state, { render, options });
    },
    a11y: () => ({
      title: services.i18n().t('bugHunt.result.timeUp'),
      nodes:
        state.lastLayout === undefined
          ? []
          : gameOverNodes(services, state, { layout: state.lastLayout, options }),
      focusId: state.menu?.focusId,
    }),
  });
}
