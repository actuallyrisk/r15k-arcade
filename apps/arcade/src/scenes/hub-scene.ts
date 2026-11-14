import { SLOT } from '@r15k/engine';
import type {
  A11yNode,
  FrameContext,
  InputDevice,
  Layout,
  RenderContext,
  Scene,
} from '@r15k/engine';
import { BUG_HUNT_GAME } from '@r15k/bug-hunt';
import {
  createMenuState,
  drawGridPaper,
  drawLabel,
  menuA11yNodes,
  promptGlyph,
  replaceWidgets,
  shouldShowFocusRing,
  UI_THEME,
} from '@r15k/ui';
import type { ButtonWidget, MenuState, WidgetIntent } from '@r15k/ui';
import type { AppServices } from '../boot/app-services.ts';
import { HUB_MUSIC_ID } from '../content/audio-manifest.ts';
import { drawCabinet } from '../hub/cabinet.ts';
import { computeHubLayout } from '../hub/hub-layout.ts';
import type { HubLayout } from '../hub/hub-layout.ts';
import { drawScoreList, scoreListNode, scoreListWidth } from '../hub/hub-scores.ts';
import { drawMenuWidgets, firstAction, playMenuSounds, stepMenu } from './menu-support.ts';
import { defineScene } from './scene-base.ts';
import { SCENE_IDS } from './scene-ids.ts';
import { capHeightOf } from './text-support.ts';

/** The prompt blinks at 1 Hz: half a second on, half a second off. */
const PROMPT_BLINK_HALF_MS = 500;
/** The cabinet widget, drawn by the hub itself. */
const SKIPPED_WIDGETS: ReadonlySet<string> = new Set(['start']);

/** What the hub does with an intent of its menu. */
type HubAction = 'start' | 'settings' | 'back';

/** The hub action of an intent. */
function hubAction(intent: WidgetIntent): HubAction | undefined {
  if (intent.kind === 'back') {
    return 'back';
  }
  if (intent.kind !== 'activate') {
    return undefined;
  }
  return intent.id === 'start' || intent.id === 'settings' ? intent.id : undefined;
}

/** The two hub buttons: the cabinet (starts Bug Hunt) and the settings gear. */
function hubWidgets(services: AppServices, hub: HubLayout): readonly ButtonWidget[] {
  const i18n = services.i18n();
  const game = i18n.t(BUG_HUNT_GAME.titleKey);
  const button = { kind: 'button', isDisabled: false } as const;
  return [
    {
      ...button,
      id: 'start',
      rect: hub.cabinet.box,
      label: i18n.t('arcade.hub.startGame', { game }),
      variant: 'primary',
      icon: undefined,
    },
    {
      ...button,
      id: 'settings',
      rect: hub.gear,
      label: i18n.t('arcade.hub.settings'),
      variant: 'icon',
      icon: 'gear',
    },
  ];
}

/** Mutable state of the hub between frames. */
interface HubState {
  menu: MenuState | undefined;
  lastDevice: InputDevice;
  isReducedMotion: boolean;
  lastLayout: Layout | undefined;
  cache: { readonly key: readonly unknown[]; readonly hub: HubLayout } | undefined;
}

/** The hub layout for a frame layout, the language and the scores (cached until one changes). */
function hubLayoutOf(services: AppServices, state: HubState, layout: Layout): HubLayout {
  const i18n = services.i18n();
  const entries = services.save.get().scores.bugHunt.arcade;
  const key = [layout, i18n, entries];
  if (state.cache?.key.every((part, index) => part === key[index]) !== true) {
    const title = i18n.t('arcade.app.title');
    const scoreWidth = scoreListWidth(entries, { i18n, text: layout.menuText });
    const hub = computeHubLayout(layout, { title, scoreRows: entries.length, scoreWidth });
    state.cache = { key, hub };
  }
  state.lastLayout = layout;
  return state.cache.hub;
}

/** The hub menu with the widgets of the current layout (created with the cabinet focused). */
function menuOf(services: AppServices, state: HubState, hub: HubLayout): MenuState {
  const widgets = hubWidgets(services, hub);
  state.menu =
    state.menu === undefined
      ? createMenuState(widgets, { focusId: 'start', navigation: 'vertical' })
      : replaceWidgets(state.menu, widgets);
  return state.menu;
}

/** Applies one frame of input to the hub menu; at most one navigation call. */
function updateHub(services: AppServices, state: HubState, frame: FrameContext): void {
  state.lastDevice = frame.input.lastDevice;
  state.isReducedMotion = frame.isReducedMotion;
  const hub = hubLayoutOf(services, state, frame.layout);
  const step = stepMenu(menuOf(services, state, hub), frame);
  state.menu = step.state;
  playMenuSounds(services.mixer, step.sounds);
  switch (firstAction(step.intents, hubAction)) {
    case 'start':
      services.navigation.startRound();
      return;
    case 'settings':
      services.navigation.openSettings();
      return;
    case 'back':
      services.navigation.back();
      return;
    case undefined:
      return;
  }
}

/** Draws the title (pink shadow) and the blinking start prompt. */
function drawHubTexts(services: AppServices, state: HubState, context: RenderContext): void {
  const { target, layout, timeMs, isReducedMotion } = context;
  const hub = hubLayoutOf(services, state, layout);
  const i18n = services.i18n();
  drawLabel(target, i18n.t('arcade.app.title'), {
    style: hub.titleStyle,
    slot: UI_THEME.text,
    shadowSlot: SLOT.pink,
    ...hub.title,
    align: 'center',
  });
  if (isReducedMotion || Math.floor(timeMs / PROMPT_BLINK_HALF_MS) % 2 === 0) {
    const key = promptGlyph('confirm', state.lastDevice);
    drawLabel(target, i18n.t(`arcade.hub.start.${state.lastDevice}`, { key }), {
      style: layout.menuText,
      slot: UI_THEME.text,
      ...hub.prompt,
      align: 'center',
    });
  }
}

/** Draws the hub: grid paper, title, cabinet, prompt, gear and scores. */
function renderHub(services: AppServices, state: HubState, context: RenderContext): void {
  const { target, layout } = context;
  const hub = hubLayoutOf(services, state, layout);
  const menu = menuOf(services, state, hub);
  const i18n = services.i18n();
  const text = layout.menuText;
  drawGridPaper(target, { x: 0, y: 0, ...layout.logical });
  drawHubTexts(services, state, context);
  drawCabinet(target, hub.cabinet, {
    game: BUG_HUNT_GAME,
    title: i18n.t(BUG_HUNT_GAME.titleKey),
    text,
    timeMs: context.timeMs,
    isReducedMotion: context.isReducedMotion,
    isPressed: menu.press?.widgetId === 'start' && !menu.press.isScrollDrag,
    hasFocusRing: menu.focusId === 'start' && shouldShowFocusRing(state.lastDevice),
  });
  drawMenuWidgets(target, menu, { text, lastDevice: state.lastDevice, skip: SKIPPED_WIDGETS });
  if (hub.scores !== undefined) {
    const entries = services.save.get().scores.bugHunt.arcade;
    drawScoreList(target, entries, { block: hub.scores, i18n, text });
  }
}

/** The mirror nodes of the hub: title, the two buttons and the score list. */
function hubNodes(services: AppServices, state: HubState, layout: Layout): readonly A11yNode[] {
  const hub = hubLayoutOf(services, state, layout);
  const menu = menuOf(services, state, hub);
  const i18n = services.i18n();
  const entries = services.save.get().scores.bugHunt.arcade;
  const line = (y: number, height: number): A11yNode['rect'] => ({ ...layout.safe, y, height });
  const heading: A11yNode = {
    kind: 'heading',
    id: 'title',
    level: 2,
    rect: line(hub.title.y, capHeightOf(hub.titleStyle)),
    label: i18n.t('arcade.app.title'),
  };
  const buttons = menuA11yNodes(menu, {
    minTouchTarget: layout.minTouchTarget,
    initialsLetter: () => '',
  });
  if (entries.length === 0) {
    return [heading, ...buttons];
  }
  // On layouts without room for the pixel list the mirror still lists the scores, on the prompt line.
  const rect = hub.scores?.rect ?? line(hub.prompt.y, capHeightOf(layout.menuText));
  return [heading, ...buttons, scoreListNode(entries, { i18n, rect })];
}

/** The hub: arcade cabinet with Bug Hunt, settings gear, top scores; plays the hub music. */
export function createHubScene(services: AppServices): Scene {
  const state: HubState = {
    menu: undefined,
    lastDevice: 'keyboard',
    isReducedMotion: false,
    lastLayout: undefined,
    cache: undefined,
  };
  const playMusic = (): void => {
    services.mixer.playMusic(HUB_MUSIC_ID);
  };
  return defineScene({
    id: SCENE_IDS.hub,
    enter: playMusic,
    reveal: playMusic,
    update: (frame) => {
      updateHub(services, state, frame);
    },
    render: (context) => {
      renderHub(services, state, context);
    },
    a11y: () => ({
      title: services.i18n().t('arcade.app.title'),
      nodes: state.lastLayout === undefined ? [] : hubNodes(services, state, state.lastLayout),
      focusId: state.menu?.focusId,
    }),
    isAnimating: () => !state.isReducedMotion,
  });
}
