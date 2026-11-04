import { notImplemented } from '@r15k/engine';
import type { RngState, SlotIndex } from '@r15k/engine';
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
export function createRoundViewState(_seed: number): RoundViewState {
  return notImplemented('bug-hunt.createRoundViewState');
}

/** Ages popups, tweens, banner and timers by dt, then applies the events of this step (pure). */
export function advanceRoundView(
  _view: RoundViewState,
  _input: {
    readonly events: readonly SimEvent[];
    readonly dt: number;
    readonly isReducedMotion: boolean;
  },
): RoundViewState {
  return notImplemented('bug-hunt.advanceRoundView');
}
