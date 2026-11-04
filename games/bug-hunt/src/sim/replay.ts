import { notImplemented } from '@r15k/engine';
import type { GameModeId } from '@r15k/engine';
import type { BugHuntInput } from './input.ts';
import type { BugHuntState } from './state.ts';

/** One input change of a replay; aimX −1 = no new aim. */
export type ReplayInputEntry = readonly [tick: number, move: -1 | 0 | 1, aimX: number];

/** A recorded round that must reproduce its final state hash exactly. */
export interface Replay {
  readonly format: 'r15k-replay';
  readonly version: 1;
  readonly game: 'bug-hunt';
  readonly mode: GameModeId;
  readonly contentVersion: number;
  readonly seed: number;
  readonly stepHz: 120;
  /** Steps to run from the initial state. */
  readonly steps: number;
  /** Strictly increasing ticks; move holds until the next entry. */
  readonly inputs: readonly ReplayInputEntry[];
  /** hashState(final state). */
  readonly finalHash: string;
  readonly finalScore: number;
  readonly note: string;
}

/** Appends an entry only when the move changed or an aim is given. */
export function appendInput(
  _entries: readonly ReplayInputEntry[],
  _tick: number,
  _input: BugHuntInput,
): readonly ReplayInputEntry[] {
  return notImplemented('bug-hunt.appendInput');
}

/** The input at a tick, reading the entries from `cursor` on. */
export function inputAt(
  _entries: readonly ReplayInputEntry[],
  _tick: number,
  _cursor: number,
): { readonly input: BugHuntInput; readonly cursor: number } {
  return notImplemented('bug-hunt.inputAt');
}

/** Runs a replay from the initial state. */
export function runReplay(_replay: Replay): {
  readonly state: BugHuntState;
  readonly hash: string;
  readonly score: number;
} {
  return notImplemented('bug-hunt.runReplay');
}

/** Records a full Arcade round driven by the bot (keyboard-style, idle or pointer aims). */
export function recordBotReplay(_options: {
  readonly seed: number;
  readonly note: string;
  readonly input?: 'bot' | 'idle' | 'pointer-bot';
}): Replay {
  return notImplemented('bug-hunt.recordBotReplay');
}
