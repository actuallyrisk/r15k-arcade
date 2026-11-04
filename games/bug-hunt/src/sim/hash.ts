import { notImplemented } from '@r15k/engine';
import type { BugHuntState } from './state.ts';

/** Hash of the canonical JSON of a state (replay regression checks). */
export function hashState(_state: BugHuntState): string {
  return notImplemented('bug-hunt.hashState');
}
