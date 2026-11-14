import { blitSprite, subTarget } from '@r15k/engine';
import type { DrawTarget, InputDevice, Layout, Point, Translator } from '@r15k/engine';
import { TUNING } from '../content/tuning.ts';
import type { BugHuntState, ItemKind } from '../sim/state.ts';
import { getHurtRemap, selectCatFrame } from './cat-animation.ts';
import { catHopPixels, shakeOffset } from './effects.ts';
import { drawRoundHud } from './hud.ts';
import { roundHudPlacement } from './hud-placement.ts';
import { catchTweenPosition, catScreenX, catTopY, drawnFall, itemBottomY } from './item-mapping.ts';
import { countdownDigit, drawBanner, drawCountdown, resumeDigit } from './overlays.ts';
import { drawPauseButton } from './pause-button.ts';
import { drawPlayfield } from './playfield.ts';
import { drawPopups } from './popups.ts';
import type { RoundViewState } from './round-view-state.ts';
import { getBugHuntSprites } from './sprite-sheets.ts';

/** Everything renderRound draws from. */
export interface RoundRenderInput {
  readonly layout: Layout;
  /** State before the most recent fixed step (= current when not stepping). */
  readonly previous: BugHuntState;
  readonly current: BugHuntState;
  readonly alpha: number;
  readonly view: RoundViewState;
  readonly bestScore: number;
  readonly i18n: Translator;
  readonly lastDevice: InputDevice;
  readonly isReducedMotion: boolean;
}

/** Sprite name of an item kind. */
const ITEM_SPRITES = { bug: 'bug', golden: 'golden-bug', bomb: 'bomb' } as const satisfies Record<
  ItemKind,
  string
>;

/** Falling items, clipped to the field (target origin = canvas origin, clip = field). */
function drawItems(field: DrawTarget, input: RoundRenderInput, offset: Point): void {
  const sprites = getBugHuntSprites().items;
  for (const item of input.current.items) {
    const sprite = sprites[ITEM_SPRITES[item.kind]];
    const bottom = itemBottomY(input.layout, drawnFall(input.previous, item, input.alpha));
    blitSprite(field, sprite, {
      x: input.layout.field.x + item.x + offset.x,
      y: Math.round(bottom) - sprite.height + offset.y,
      frame: input.isReducedMotion
        ? 0
        : Math.floor(item.animSeconds / TUNING.view.itemFrameSeconds),
    });
  }
}

/** Caught bugs flying into the paws, then the cat itself. */
function drawCatAndTweens(field: DrawTarget, input: RoundRenderInput, offset: Point): void {
  const { layout, view, isReducedMotion } = input;
  const sprites = getBugHuntSprites();
  const catX = catScreenX(layout, input, input.alpha);
  const catTop = catTopY(layout, catHopPixels(view, isReducedMotion));
  for (const tween of view.catchTweens) {
    const sprite = sprites.items[ITEM_SPRITES[tween.itemKind]];
    const at = catchTweenPosition(layout, tween, { catX, catTop, spriteHeight: sprite.height });
    blitSprite(field, sprite, { x: at.x + offset.x, y: at.y + offset.y });
  }
  const pose = selectCatFrame(input.current.cat, isReducedMotion);
  blitSprite(field, sprites.cat[pose.sprite], {
    x: catX + offset.x,
    y: catTop + offset.y,
    frame: pose.frame,
    isMirrored: pose.isMirrored,
    ...(pose.isHurt ? { remap: getHurtRemap() } : {}),
  });
}

/** Countdown (round start or resume) and banners over the field. */
function drawOverlays(target: DrawTarget, input: RoundRenderInput): void {
  const { layout, current, view, i18n } = input;
  if (current.phase === 'countdown') {
    drawCountdown(target, layout, { digit: countdownDigit(current), i18n });
  } else if (view.resumeSeconds > 0) {
    drawCountdown(target, layout, { digit: resumeDigit(view.resumeSeconds), i18n });
  } else if (view.banner !== undefined && current.phase === 'playing') {
    drawBanner(target, layout, { banner: view.banner, i18n });
  }
}

/** Draws the whole round: grid paper, field, ground, items, cat, popups, HUD, overlays, pause button. */
export function renderRound(target: DrawTarget, input: RoundRenderInput): void {
  const { layout } = input;
  drawPlayfield(target, layout);
  const field = subTarget(target, layout.field);
  const fieldOrigin = { ...field, origin: target.origin };
  const offset = shakeOffset(input.view, input.isReducedMotion);
  drawItems(fieldOrigin, input, offset);
  drawCatAndTweens(fieldOrigin, input, offset);
  drawPopups(field, {
    layout,
    popups: input.view.popups,
    i18n: input.i18n,
    catTop: catTopY(layout, 0) - layout.field.y,
    offset,
    isReducedMotion: input.isReducedMotion,
  });
  const placement = roundHudPlacement(layout);
  drawRoundHud(target, {
    layout,
    placement,
    state: input.current,
    bestScore: input.bestScore,
    i18n: input.i18n,
    lastDevice: input.lastDevice,
  });
  drawOverlays(target, input);
  drawPauseButton(target, layout, placement);
}
