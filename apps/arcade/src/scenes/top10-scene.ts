import { fillRect, strokeRect } from '@r15k/engine';
import type {
  A11yNode,
  DrawTarget,
  FrameContext,
  InputDevice,
  Layout,
  Rect,
  RenderContext,
  Scene,
  Translator,
} from '@r15k/engine';
import {
  createMenuState,
  drawGridPaper,
  drawLabel,
  ICONS,
  labelWidth,
  menuA11yNodes,
  replaceWidgets,
  UI_THEME,
} from '@r15k/ui';
import type { ButtonWidget, MenuState, WidgetIntent } from '@r15k/ui';
import type { AppServices } from '../boot/app-services.ts';
import type { ScoreEntryV1 } from '../save/save-schema.ts';
import { scoreListNode } from '../hub/hub-scores.ts';
import { drawMenuWidgets, firstAction, playMenuSounds, stepMenu } from './menu-support.ts';
import { defineScene } from './scene-base.ts';
import { SCENE_IDS } from './scene-ids.ts';
import { capHeightOf } from './text-support.ts';
import { computeTop10Layout } from './top10-layout.ts';
import type { Top10Layout } from './top10-layout.ts';

/** Which entry is the new one. */
export interface Top10SceneOptions {
  readonly highlightRank: number | undefined;
}

/** Gap between the rank, the initials and the score of a row. */
const ROW_GAP = 4;

/** What the top-10 screen does with an intent. */
type Top10Action = 'again' | 'hub' | 'back';

/** The action of an intent of the footer menu. */
function top10Action(intent: WidgetIntent): Top10Action | undefined {
  if (intent.kind === 'back') {
    return 'back';
  }
  if (intent.kind !== 'activate') {
    return undefined;
  }
  return intent.id === 'again' || intent.id === 'hub' ? intent.id : undefined;
}

/** Play again (primary) and To hub (secondary) in the footer. */
function footerWidgets(i18n: Translator, top10: Top10Layout): readonly ButtonWidget[] {
  const button = (id: 'again' | 'hub', rect: Rect): ButtonWidget => ({
    kind: 'button',
    id,
    rect,
    label: i18n.t(`arcade.top10.${id}`),
    isDisabled: false,
    variant: id === 'again' ? 'primary' : 'secondary',
    icon: undefined,
  });
  return [button('again', top10.buttons[0]), button('hub', top10.buttons[1])];
}

/** The rect of a rank's row (1-based), in its column. */
function rowRect(top10: Top10Layout, rank: number): Rect | undefined {
  const perColumn = top10.columns.length === 1 ? 10 : 5;
  const column = top10.columns[Math.floor((rank - 1) / perColumn)];
  if (column === undefined) {
    return undefined;
  }
  const y = column.y + ((rank - 1) % perColumn) * top10.rowHeight;
  return { x: column.x, y, width: column.width, height: top10.rowHeight };
}

/** Draws one row: `rank. AAA` left, the score right-aligned; the new entry framed with a ▶ marker. */
function drawRow(
  target: DrawTarget,
  context: {
    readonly top10: Top10Layout;
    readonly layout: Layout;
    readonly i18n: Translator;
    readonly entry: ScoreEntryV1;
    readonly rank: number;
    readonly isSelected: boolean;
  },
): void {
  const { top10, layout, entry, rank } = context;
  const row = rowRect(top10, rank);
  if (row === undefined) {
    return;
  }
  const style = layout.menuText;
  const box = { ...row, x: row.x + top10.markerWidth, width: row.width - top10.markerWidth };
  if (context.isSelected) {
    fillRect(target, box, UI_THEME.selectedFill);
    strokeRect(target, box, UI_THEME.selectedBorder);
    drawLabel(target, ICONS.play, { style, slot: UI_THEME.selectedBorder, x: row.x, y: row.y + 2 });
  }
  const look = { style, slot: UI_THEME.text, y: row.y + 2 };
  const rankRight = box.x + 2 + labelWidth('10.', style);
  drawLabel(target, `${rank}.`, { ...look, x: rankRight, align: 'right' });
  drawLabel(target, entry.initials, { ...look, x: rankRight + ROW_GAP });
  drawLabel(target, context.i18n.formatInteger(entry.score), {
    ...look,
    x: box.x + box.width - 2,
    align: 'right',
  });
}

/** State of the top-10 screen between frames. */
interface Top10State {
  menu: MenuState | undefined;
  lastDevice: InputDevice;
  lastLayout: Layout | undefined;
}

/** The layout and the synced footer menu. */
function syncTop10(
  services: AppServices,
  state: Top10State,
  layout: Layout,
): { readonly top10: Top10Layout; readonly menu: MenuState } {
  state.lastLayout = layout;
  const i18n = services.i18n();
  const top10 = computeTop10Layout(layout, i18n.t('arcade.top10.title'));
  const widgets = footerWidgets(i18n, top10);
  const navigation = top10.isFooterStacked ? 'vertical' : 'horizontal';
  state.menu =
    state.menu === undefined
      ? createMenuState(widgets, { focusId: 'again', navigation })
      : replaceWidgets(state.menu, widgets);
  return { top10, menu: state.menu };
}

/** One frame: Play again starts a round, To hub and back go to the hub (one navigation call). */
function updateTop10(services: AppServices, state: Top10State, frame: FrameContext): void {
  state.lastDevice = frame.input.lastDevice;
  const step = stepMenu(syncTop10(services, state, frame.layout).menu, frame);
  state.menu = step.state;
  playMenuSounds(services.mixer, step.sounds);
  switch (firstAction(step.intents, top10Action)) {
    case 'again':
      services.navigation.startRound();
      return;
    case 'hub':
      services.navigation.toHub();
      return;
    case 'back':
      services.navigation.back();
      return;
    case undefined:
      return;
  }
}

/** Draws "no scores yet" centred where the rows would be. */
function drawEmpty(
  target: DrawTarget,
  context: { readonly top10: Top10Layout; readonly layout: Layout; readonly i18n: Translator },
): void {
  const { top10, layout } = context;
  const first = top10.columns[0];
  const top = first?.y ?? top10.title.y;
  const height = first?.height ?? 0;
  drawLabel(target, context.i18n.t('arcade.top10.empty'), {
    style: layout.menuText,
    slot: UI_THEME.textMuted,
    x: top10.title.x,
    y: top + Math.floor((height - capHeightOf(layout.menuText)) / 2),
    align: 'center',
  });
}

/** Draws the title, the rows (or the empty notice) and the footer. */
function renderTop10(
  services: AppServices,
  state: Top10State,
  context: { readonly render: RenderContext; readonly highlightRank: number | undefined },
): void {
  const { target, layout } = context.render;
  const { top10, menu } = syncTop10(services, state, layout);
  const i18n = services.i18n();
  const entries = services.save.get().scores.bugHunt.arcade;
  drawGridPaper(target, { x: 0, y: 0, ...layout.logical });
  drawLabel(target, i18n.t('arcade.top10.title'), {
    style: top10.titleStyle,
    slot: UI_THEME.text,
    ...top10.title,
    align: 'center',
  });
  if (entries.length === 0) {
    drawEmpty(target, { top10, layout, i18n });
  }
  entries.forEach((entry, index) => {
    drawRow(target, {
      top10,
      layout,
      i18n,
      entry,
      rank: index + 1,
      isSelected: index + 1 === context.highlightRank,
    });
  });
  drawMenuWidgets(target, menu, { text: layout.menuText, lastDevice: state.lastDevice });
}

/** The mirror nodes: title, the score list and the two buttons. */
function top10Nodes(services: AppServices, state: Top10State, layout: Layout): readonly A11yNode[] {
  const { top10, menu } = syncTop10(services, state, layout);
  const i18n = services.i18n();
  const entries = services.save.get().scores.bugHunt.arcade;
  const first = top10.columns[0] ?? layout.safe;
  const last = top10.columns.at(-1) ?? first;
  const listRect = {
    x: first.x,
    y: first.y,
    width: last.x + last.width - first.x,
    height: first.height,
  };
  const titleRect = { ...listRect, y: top10.title.y, height: capHeightOf(top10.titleStyle) };
  const list = scoreListNode(entries, { i18n, rect: listRect });
  return [
    {
      kind: 'heading',
      id: 'title',
      level: 2,
      rect: titleRect,
      label: i18n.t('arcade.top10.title'),
    },
    ...(entries.length === 0 ? [] : [{ ...list, label: i18n.t('arcade.top10.title') }]),
    ...menuA11yNodes(menu, { minTouchTarget: layout.minTouchTarget, initialsLetter: () => '' }),
  ];
}

/** The Arcade top 10 with "play again" and "to hub". */
export function createTop10Scene(services: AppServices, options: Top10SceneOptions): Scene {
  const state: Top10State = { menu: undefined, lastDevice: 'keyboard', lastLayout: undefined };
  return defineScene({
    id: SCENE_IDS.top10,
    enter: () => {
      if (options.highlightRank !== undefined) {
        services.announce(services.i18n().t('arcade.a11y.rank', { rank: options.highlightRank }));
      }
    },
    update: (frame) => {
      updateTop10(services, state, frame);
    },
    render: (render) => {
      renderTop10(services, state, { render, highlightRank: options.highlightRank });
    },
    a11y: () => ({
      title: services.i18n().t('arcade.top10.title'),
      nodes: state.lastLayout === undefined ? [] : top10Nodes(services, state, state.lastLayout),
      focusId: state.menu?.focusId,
    }),
  });
}
