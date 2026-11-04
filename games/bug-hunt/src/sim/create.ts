import { notImplemented } from '@r15k/engine';
import type { GameModeId } from '@r15k/engine';
import type { BugHuntState } from './state.ts';

/** The state at the start of a round (countdown phase). */
export function createInitialState(_options: {
  readonly seed: number;
  readonly mode: GameModeId;
}): BugHuntState {
  return notImplemented('bug-hunt.createInitialState');
}
