import { closeRng, nextInt, openRng, seedRng, SLOT } from '@r15k/engine';
import type { RngState, SlotIndex } from '@r15k/engine';
import { TUNING } from '../content/tuning.ts';
import type { SimEvent } from '../sim/events.ts';

/** A score popup; its text is formatted at render time (renderRound has the translator). */
export interface Popup {
  /** bugHunt.popup.points ('+{value}') / bugHunt.popup.penalty ('-{value}'). */
  readonly kind: 'points' | 'penalty';
  /** catch: event.points; bomb: event.penalty. */
  readonly value: number;
  /** bug blueInk, golden gold, bomb pinkInk. */
  readonly slot: SlotIndex;
  /** Field px, centre: event.x + floor(item width / 2). */
  readonly x: number;
  /**
   * Seconds since the popup appeared. A catch popup starts negative (minus the catch tween) and is
   * drawn from 0 on, so it appears when the caught item reaches the paws.
   */
  readonly ageSeconds: number;
}

/** A banner over the field. */
export interface Banner {
  readonly key: 'bugHunt.countdown.go' | 'bugHunt.banner.fridayDeploy';
  readonly remainingSeconds: number;
}

/** A caught item flying into the cat's paws (view only). */
export interface CatchTween {
  readonly itemKind: 'bug' | 'golden';
  /** event.x (item left edge, field px). */
  readonly fromX: number;
  /** event.fall (fall progress when caught). */
  readonly fromFall: number;
  readonly ageSeconds: number;
}

/** View-only state of a round (popups, banners, shake, tweens, resume countdown). */
export interface RoundViewState {
  /** Newest last. */
  readonly popups: readonly Popup[];
  readonly banner: Banner | undefined;
  /** Never started with reduced motion. */
  readonly shakeSeconds: number;
  /** View-only RNG, seeded from the round seed and the shake salt. */
  readonly shakeRng: RngState;
  readonly catHopSeconds: number;
  /** None added with reduced motion. */
  readonly catchTweens: readonly CatchTween[];
  /** > 0 while the resume countdown runs. */
  readonly resumeSeconds: number;
}

/** An empty view state: no popups, no banner, timers 0, shake RNG seeded. */
export function createRoundViewState(seed: number): RoundViewState {
  return {
    popups: [],
    banner: undefined,
    shakeSeconds: 0,
    shakeRng: seedRng(seed ^ TUNING.view.shakeSeedSalt),
    catHopSeconds: 0,
    catchTweens: [],
    resumeSeconds: 0,
  };
}

/** Counts a timer down, never below 0. */
function countDown(seconds: number, dt: number): number {
  return Math.max(0, seconds - dt);
}

/** Two draws per shaking step, so every step shows a new offset (render only peeks). */
function advanceShakeRng(rng: RngState): RngState {
  const cursor = openRng(rng);
  nextInt(cursor, 3);
  nextInt(cursor, 3);
  return closeRng(cursor);
}

/** Ages every timer by dt and drops what expired. */
function ageView(view: RoundViewState, dt: number): RoundViewState {
  const shakeSeconds = countDown(view.shakeSeconds, dt);
  const remaining = (view.banner?.remainingSeconds ?? 0) - dt;
  return {
    popups: view.popups
      .map((popup) => ({ ...popup, ageSeconds: popup.ageSeconds + dt }))
      .filter((popup) => popup.ageSeconds < TUNING.view.popupSeconds),
    banner:
      view.banner === undefined || remaining <= 0
        ? undefined
        : { ...view.banner, remainingSeconds: remaining },
    shakeSeconds,
    shakeRng: shakeSeconds > 0 ? advanceShakeRng(view.shakeRng) : view.shakeRng,
    catHopSeconds: countDown(view.catHopSeconds, dt),
    catchTweens: view.catchTweens
      .map((tween) => ({ ...tween, ageSeconds: tween.ageSeconds + dt }))
      .filter((tween) => tween.ageSeconds < TUNING.view.catchTweenSeconds),
    resumeSeconds: countDown(view.resumeSeconds, dt),
  };
}

/** Adds a popup, keeping at most the newest `maxPopups`. */
function withPopup(view: RoundViewState, popup: Popup): RoundViewState {
  return { ...view, popups: [...view.popups, popup].slice(-TUNING.view.maxPopups) };
}

/** Centre of an item in field px from its left edge. */
function itemCentre(x: number): number {
  return x + Math.floor(TUNING.item.width / 2);
}

/** A catch: points popup, cat hop and (without reduced motion) the tween into the paws. */
function applyCatch(
  view: RoundViewState,
  event: Extract<SimEvent, { readonly kind: 'catch' }>,
  isReducedMotion: boolean,
): RoundViewState {
  const startAge = isReducedMotion ? 0 : -TUNING.view.catchTweenSeconds;
  const withHop = withPopup(view, {
    kind: 'points',
    value: event.points,
    slot: event.itemKind === 'golden' ? SLOT.gold : SLOT.blueInk,
    x: itemCentre(event.x),
    ageSeconds: startAge,
  });
  const tween: CatchTween = {
    itemKind: event.itemKind,
    fromX: event.x,
    fromFall: event.fall,
    ageSeconds: 0,
  };
  return {
    ...withHop,
    catHopSeconds: TUNING.view.catHopSeconds,
    catchTweens: isReducedMotion ? withHop.catchTweens : [...withHop.catchTweens, tween],
  };
}

/** A caught bomb: penalty popup, banner and (without reduced motion) the screen shake. */
function applyBomb(
  view: RoundViewState,
  event: Extract<SimEvent, { readonly kind: 'bomb' }>,
  isReducedMotion: boolean,
): RoundViewState {
  const withPenalty = withPopup(view, {
    kind: 'penalty',
    value: event.penalty,
    slot: SLOT.pinkInk,
    x: itemCentre(event.x),
    ageSeconds: 0,
  });
  return {
    ...withPenalty,
    banner: {
      key: 'bugHunt.banner.fridayDeploy',
      remainingSeconds: TUNING.view.bombBannerSeconds,
    },
    shakeSeconds: isReducedMotion ? 0 : TUNING.view.shakeSeconds,
  };
}

/** Applies one simulation event to the view (catch, bomb and go change it). */
function applyEvent(
  view: RoundViewState,
  event: SimEvent,
  isReducedMotion: boolean,
): RoundViewState {
  if (event.kind === 'catch') {
    return applyCatch(view, event, isReducedMotion);
  }
  if (event.kind === 'bomb') {
    return applyBomb(view, event, isReducedMotion);
  }
  if (event.kind === 'go') {
    const banner: Banner = {
      key: 'bugHunt.countdown.go',
      remainingSeconds: TUNING.view.goBannerSeconds,
    };
    return { ...view, banner };
  }
  return view;
}

/** Ages popups, tweens, banner and timers by dt, then applies the events of this step (pure). */
export function advanceRoundView(
  view: RoundViewState,
  input: {
    readonly events: readonly SimEvent[];
    readonly dt: number;
    readonly isReducedMotion: boolean;
  },
): RoundViewState {
  return input.events.reduce(
    (state, event) => applyEvent(state, event, input.isReducedMotion),
    ageView(view, input.dt),
  );
}
