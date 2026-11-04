import { notImplemented } from '@r15k/engine';
import type { DrawTarget, InputDevice, Layout, Translator } from '@r15k/engine';
import type { BugHuntState } from '../sim/state.ts';
import type { RoundViewState } from './round-view-state.ts';

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

/** Draws the whole round: grid paper, field, ground, items, cat, popups, HUD, overlays, pause button. */
export function renderRound(_target: DrawTarget, _input: RoundRenderInput): void {
  return notImplemented('bug-hunt.renderRound');
}
