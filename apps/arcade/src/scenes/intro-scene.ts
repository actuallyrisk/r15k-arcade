import { contentRegions, fillRect, rectBottom, SLOT, translateRect } from '@r15k/engine';
import type {
  A11yNode,
  FrameContext,
  InputFrame,
  Layout,
  Point,
  Rect,
  RenderContext,
  Scene,
  Translator,
} from '@r15k/engine';
import { drawGridPaper, drawLabel, labelWidth, UI_THEME, wrapLabel } from '@r15k/ui';
import type { TextStyle } from '@r15k/ui';
import type { AppServices } from '../boot/app-services.ts';
import { INTRO_TIMING } from '../content/intro-timing.ts';
import { introStage, stageKey } from './intro-timeline.ts';
import type { IntroStage, IntroTiming } from './intro-timeline.ts';
import { defineScene } from './scene-base.ts';
import { SCENE_IDS } from './scene-ids.ts';
import { blockHeightOf, capHeightOf, fittingStyle, lineStepOf } from './text-support.ts';

/** Length of the intro. */
export type IntroMode = 'full' | 'short';

/** Padding inside the counter box (as the 404 page's count box). */
const BOX_PADDING = 4;
/** Offset of the counter box's blue shadow. */
const BOX_SHADOW = 3;
/** Gap between "CONTINUE?" and the box, and between the text blocks. */
const GAP = 8;
/** Margin to the display region's edges. */
const MARGIN = 4;

/** Where the parts of the intro go for one layout. */
interface IntroLayout {
  readonly gameOverStyle: TextStyle;
  readonly gameOver: Point;
  readonly label: Point;
  readonly labelAlign: 'left' | 'center';
  readonly box: Rect;
  readonly hint: readonly string[];
  readonly hintTop: number;
}

/** The counter row: "CONTINUE?" beside the box when both fit, else above it. */
function counterRow(
  i18n: Translator,
  context: { readonly display: Rect; readonly style: TextStyle; readonly top: number },
): Pick<IntroLayout, 'label' | 'labelAlign' | 'box'> & { readonly height: number } {
  const { display, style, top } = context;
  const cap = capHeightOf(style);
  const box = {
    width: labelWidth(i18n.t('arcade.intro.insertCoin'), style) + 2 * BOX_PADDING,
    height: cap + 2 * BOX_PADDING,
  };
  const labelWidthPx = labelWidth(i18n.t('arcade.intro.continue'), style);
  const centreX = display.x + Math.floor(display.width / 2);
  const rowWidth = labelWidthPx + GAP + box.width;
  if (rowWidth <= display.width - 2 * MARGIN) {
    const left = centreX - Math.floor(rowWidth / 2);
    return {
      label: { x: left, y: top + BOX_PADDING },
      labelAlign: 'left',
      box: { ...box, x: left + labelWidthPx + GAP, y: top },
      height: box.height,
    };
  }
  return {
    label: { x: centreX, y: top },
    labelAlign: 'center',
    box: { ...box, x: centreX - Math.floor(box.width / 2), y: top + cap + GAP },
    height: cap + GAP + box.height,
  };
}

/** Lays out GAME OVER (× 3 if it fits, else × 2), the counter row and the skip hint. */
function computeIntroLayout(layout: Layout, i18n: Translator): IntroLayout {
  const { display } = contentRegions(layout);
  const style = layout.menuText;
  const gameOverStyle = fittingStyle(i18n.t('arcade.intro.gameOver'), style, {
    factors: [3, 2],
    maxWidth: display.width - 2 * MARGIN,
  });
  const hint = wrapLabel(i18n.t('arcade.intro.skipHint'), {
    style,
    maxWidth: display.width - 2 * MARGIN,
  });
  const hintTop = rectBottom(display) - MARGIN - blockHeightOf(hint.length, style);
  const gameOverHeight = capHeightOf(gameOverStyle);
  const rowHeight = counterRow(i18n, { display, style, top: 0 }).height;
  const blockHeight = gameOverHeight + 2 * GAP + rowHeight;
  const top = display.y + Math.max(0, Math.floor((hintTop - display.y - blockHeight) / 2));
  const row = counterRow(i18n, { display, style, top: top + gameOverHeight + 2 * GAP });
  return {
    gameOverStyle,
    gameOver: { x: display.x + Math.floor(display.width / 2), y: top },
    label: row.label,
    labelAlign: row.labelAlign,
    box: row.box,
    hint,
    hintTop,
  };
}

/** Draws the counter box (ink with a blue shadow) with the digit or the blinking INSERT COIN. */
function drawCounter(
  target: RenderContext['target'],
  context: {
    readonly intro: IntroLayout;
    readonly text: string | undefined;
    readonly style: TextStyle;
  },
): void {
  const { box } = context.intro;
  fillRect(target, translateRect(box, { x: BOX_SHADOW, y: BOX_SHADOW }), SLOT.blue);
  fillRect(target, box, SLOT.ink);
  if (context.text !== undefined) {
    drawLabel(target, context.text, {
      style: context.style,
      slot: SLOT.paper,
      x: box.x + Math.floor(box.width / 2),
      y: box.y + BOX_PADDING,
      align: 'center',
    });
  }
}

/** What the box shows in a stage (INSERT COIN blinks unless motion is reduced). */
function counterText(
  i18n: Translator,
  context: { readonly stage: IntroStage; readonly isReducedMotion: boolean },
): string | undefined {
  const { stage } = context;
  if (stage.kind === 'continue') {
    return String(stage.digit);
  }
  if (stage.kind !== 'insert-coin') {
    return undefined;
  }
  const period = INTRO_TIMING.blinkPeriodSeconds;
  const isShown = context.isReducedMotion || stage.secondsIn % period < period / 2;
  return isShown ? i18n.t('arcade.intro.insertCoin') : undefined;
}

/** Draws the intro for a stage. */
function renderIntro(
  i18n: Translator,
  context: { readonly render: RenderContext; readonly stage: IntroStage },
): void {
  const { render, stage } = context;
  const { target, layout } = render;
  const style = layout.menuText;
  const intro = computeIntroLayout(layout, i18n);
  drawGridPaper(target, { x: 0, y: 0, ...layout.logical });
  drawLabel(target, i18n.t('arcade.intro.gameOver'), {
    style: intro.gameOverStyle,
    slot: UI_THEME.text,
    shadowSlot: SLOT.pink,
    ...intro.gameOver,
    align: 'center',
  });
  if (stage.kind === 'continue' || stage.kind === 'insert-coin') {
    drawLabel(target, i18n.t('arcade.intro.continue'), {
      style,
      slot: UI_THEME.text,
      ...intro.label,
      align: intro.labelAlign,
    });
    drawCounter(target, {
      intro,
      style,
      text: counterText(i18n, { stage, isReducedMotion: render.isReducedMotion }),
    });
  }
  const centreX = intro.gameOver.x;
  intro.hint.forEach((line, index) => {
    drawLabel(target, line, {
      style,
      slot: UI_THEME.textMuted,
      x: centreX,
      y: intro.hintTop + index * lineStepOf(style),
      align: 'center',
    });
  });
}

/** Whether a frame skips the intro: any action press, key, tap, click, button or mirror activation. */
function isSkip(frame: FrameContext): boolean {
  const input: InputFrame = frame.input;
  const isPress = Object.values(input.actions).some((action) => action.wasPressed);
  const isKey =
    input.hadActivity && (input.lastDevice === 'keyboard' || input.lastDevice === 'gamepad');
  const isActivation = frame.a11yEvents.some((event) => event.kind === 'activate');
  return (
    isPress || isKey || isActivation || input.releases.length > 0 || input.typedChars.length > 0
  );
}

/** State of the intro between frames. */
interface IntroState {
  readonly timing: IntroTiming;
  elapsed: number;
  lastKey: string;
  isDone: boolean;
  lastLayout: Layout | undefined;
}

/** One frame: time runs on, a new digit ticks, INSERT COIN plays the coin; skip or the end → hub. */
function updateIntro(services: AppServices, state: IntroState, frame: FrameContext): void {
  state.lastLayout = frame.layout;
  if (state.isDone) {
    return;
  }
  state.elapsed += frame.deltaSeconds;
  const stage = introStage(state.timing, state.elapsed);
  if (isSkip(frame) || stage.kind === 'done') {
    state.isDone = true;
    services.navigation.toHub();
    return;
  }
  const key = stageKey(stage);
  if (key !== state.lastKey && (stage.kind === 'continue' || stage.kind === 'insert-coin')) {
    services.mixer.playSfx(stage.kind === 'continue' ? 'intro-tick' : 'coin');
  }
  state.lastKey = key;
}

/** The mirror nodes: the GAME OVER heading and the skip hint. */
function introNodes(services: AppServices, layout: Layout): readonly A11yNode[] {
  const i18n = services.i18n();
  const intro = computeIntroLayout(layout, i18n);
  const width = layout.safe.width;
  const headingHeight = capHeightOf(intro.gameOverStyle);
  const hintHeight = blockHeightOf(intro.hint.length, layout.menuText);
  return [
    {
      kind: 'heading',
      id: 'game-over',
      level: 2,
      rect: { x: layout.safe.x, y: intro.gameOver.y, width, height: headingHeight },
      label: i18n.t('arcade.intro.gameOver'),
    },
    {
      kind: 'text',
      id: 'skip-hint',
      rect: { x: layout.safe.x, y: intro.hintTop, width, height: hintHeight },
      label: i18n.t('arcade.intro.skipHint'),
    },
  ];
}

/** GAME OVER → CONTINUE? 9 … 0 → INSERT COIN; any key, tap, button or activation skips. */
export function createIntroScene(services: AppServices, mode: IntroMode): Scene {
  const state: IntroState = {
    timing: INTRO_TIMING[mode],
    elapsed: 0,
    lastKey: '',
    isDone: false,
    lastLayout: undefined,
  };
  return defineScene({
    id: SCENE_IDS.intro,
    update: (frame) => {
      updateIntro(services, state, frame);
    },
    render: (render) => {
      state.lastLayout = render.layout;
      const stage = introStage(state.timing, state.elapsed);
      renderIntro(services.i18n(), { render, stage });
    },
    a11y: () => ({
      title: services.i18n().t('arcade.app.title'),
      nodes: state.lastLayout === undefined ? [] : introNodes(services, state.lastLayout),
      focusId: undefined,
    }),
    isAnimating: () => !state.isDone,
  });
}
