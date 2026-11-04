import { SIM_STEP_HZ, SIM_STEP_SECONDS } from '@r15k/engine';
import type { GameModeId } from '@r15k/engine';
import { TUNING } from '../content/tuning.ts';
import { CONTENT_VERSION } from '../content/version.ts';
import { botInput } from './bot.ts';
import { botAimX, botTarget } from './bot-target.ts';
import { normalizeAimX } from './cat.ts';
import { createInitialState } from './create.ts';
import { NO_AIM_X, ROUND_TOTAL_TICKS } from './derived.ts';
import { hashState } from './hash.ts';
import { NO_INPUT } from './input.ts';
import type { BugHuntInput } from './input.ts';
import type { BugHuntState } from './state.ts';
import { step } from './step.ts';

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
  entries: readonly ReplayInputEntry[],
  tick: number,
  input: BugHuntInput,
): readonly ReplayInputEntry[] {
  const heldMove = entries.at(-1)?.[1] ?? 0;
  if (input.move === heldMove && input.aimX === undefined) {
    return entries;
  }
  const aimX = input.aimX === undefined ? NO_AIM_X : normalizeAimX(input.aimX);
  return [...entries, [tick, input.move, aimX]];
}

/** The input at a tick, reading the entries from `cursor` on. */
export function inputAt(
  entries: readonly ReplayInputEntry[],
  tick: number,
  cursor: number,
): { readonly input: BugHuntInput; readonly cursor: number } {
  let next = cursor;
  for (let pending = entries[next]; pending !== undefined && pending[0] <= tick;) {
    next += 1;
    pending = entries[next];
  }
  const entry = entries[next - 1];
  if (entry === undefined) {
    return { input: NO_INPUT, cursor: next };
  }
  const [entryTick, move, aimX] = entry;
  const isAimStep = entryTick === tick && aimX !== NO_AIM_X;
  return { input: { move, aimX: isAimStep ? aimX : undefined }, cursor: next };
}

/** Runs a replay from the initial state. */
export function runReplay(replay: Replay): {
  readonly state: BugHuntState;
  readonly hash: string;
  readonly score: number;
} {
  let state = createInitialState({ seed: replay.seed, mode: replay.mode });
  let cursor = 0;
  for (let tick = 0; tick < replay.steps; tick += 1) {
    const read = inputAt(replay.inputs, tick, cursor);
    cursor = read.cursor;
    state = step(state, read.input, SIM_STEP_SECONDS).state;
  }
  return { state, hash: hashState(state), score: state.score };
}

/** Input source of a recording, called once per step with the state before the step. */
type InputDriver = (state: BugHuntState) => BugHuntInput;

/** Pointer-style bot: one aim under each new target at pointer speed; it does not dodge bombs. */
function createPointerBot(): InputDriver {
  let aimedItemId: number | undefined;
  return (state) => {
    const target = botTarget(state, TUNING.cat.pointerSpeed);
    if (target === undefined || target.id === aimedItemId) {
      return NO_INPUT;
    }
    aimedItemId = target.id;
    return { move: 0, aimX: botAimX(target) };
  };
}

/** The input source of a recording kind. */
function createDriver(kind: 'bot' | 'idle' | 'pointer-bot'): InputDriver {
  switch (kind) {
    case 'bot':
      return botInput;
    case 'idle':
      return () => NO_INPUT;
    case 'pointer-bot':
      return createPointerBot();
  }
}

/** Records a full Arcade round driven by the bot (keyboard-style, idle or pointer aims). */
export function recordBotReplay(options: {
  readonly seed: number;
  readonly note: string;
  readonly input?: 'bot' | 'idle' | 'pointer-bot';
}): Replay {
  const driver = createDriver(options.input ?? 'bot');
  let state = createInitialState({ seed: options.seed, mode: 'arcade' });
  let inputs: readonly ReplayInputEntry[] = [];
  for (let tick = 0; tick < ROUND_TOTAL_TICKS; tick += 1) {
    const input = driver(state);
    inputs = appendInput(inputs, tick, input);
    state = step(state, input, SIM_STEP_SECONDS).state;
  }
  return {
    format: 'r15k-replay',
    version: 1,
    game: 'bug-hunt',
    mode: state.mode,
    contentVersion: CONTENT_VERSION,
    seed: options.seed,
    stepHz: SIM_STEP_HZ,
    steps: ROUND_TOTAL_TICKS,
    inputs,
    finalHash: hashState(state),
    finalScore: state.score,
    note: options.note,
  };
}
