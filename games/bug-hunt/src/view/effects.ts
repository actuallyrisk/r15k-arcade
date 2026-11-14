import { nextInt, openRng } from '@r15k/engine';
import type { Point } from '@r15k/engine';
import { TUNING } from '../content/tuning.ts';
import type { RoundViewState } from './round-view-state.ts';

/** Offsets per axis: −1, 0 or +1 times the amplitude. */
const SHAKE_STEPS = 3;

/** No offset. */
const NO_SHAKE: Point = { x: 0, y: 0 };

/**
 * The screen shake offset of items, cat and popups: x ∈ {−shakeX, 0, shakeX}, y ∈ {−shakeY, 0,
 * shakeY} from the view's shake RNG (only read here; advanceRoundView moves it on); none with reduced
 * motion or when no shake runs.
 */
export function shakeOffset(view: RoundViewState, isReducedMotion: boolean): Point {
  if (isReducedMotion || view.shakeSeconds <= 0) {
    return NO_SHAKE;
  }
  const cursor = openRng(view.shakeRng);
  return {
    x: (nextInt(cursor, SHAKE_STEPS) - 1) * TUNING.view.shakeX,
    y: (nextInt(cursor, SHAKE_STEPS) - 1) * TUNING.view.shakeY,
  };
}

/** Pixels the cat is lifted by its catch hop (none with reduced motion). */
export function catHopPixels(view: RoundViewState, isReducedMotion: boolean): number {
  return view.catHopSeconds > 0 && !isReducedMotion ? TUNING.view.catHopPixels : 0;
}
