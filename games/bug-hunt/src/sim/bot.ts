import { notImplemented } from '@r15k/engine';
import type { BugHuntInput } from './input.ts';
import type { BugHuntState } from './state.ts';

/** Deterministic bot input (replays now, attract mode later): chase catchable bugs, avoid bombs. */
export function botInput(_state: BugHuntState): BugHuntInput {
  return notImplemented('bug-hunt.botInput');
}
