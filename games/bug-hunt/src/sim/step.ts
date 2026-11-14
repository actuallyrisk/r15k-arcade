import { SIM_STEP_HZ, SIM_STEP_SECONDS } from '@r15k/engine';
import { TUNING } from '../content/tuning.ts';
import { updateCat } from './cat.ts';
import { COUNTDOWN_TICKS, DIGIT_PERIOD_TICKS, ROUND_TICKS } from './derived.ts';
import type { SimEvent } from './events.ts';
import type { BugHuntInput } from './input.ts';
import { advanceItems, resolveItems } from './items.ts';
import { advanceSpawn } from './spawn.ts';
import type { SpawnOutcome } from './spawn.ts';
import type { BugHuntState } from './state.ts';

/** The state after one step and what happened in it. */
export interface StepResult {
  readonly state: BugHuntState;
  readonly events: readonly SimEvent[];
}

/** Countdown digit shown while `ticks` countdown steps remain. */
function countdownDigit(ticks: number): 1 | 2 | 3 {
  const digit = Math.ceil(ticks / DIGIT_PERIOD_TICKS);
  return digit >= 3 ? 3 : digit === 2 ? 2 : 1;
}

/** Countdown phase: a digit event whenever the digit changes, then "go" and the first spawn delay. */
function countdownStep(state: BugHuntState): StepResult {
  const ticks = state.countdownTicks;
  const isNewDigit =
    ticks === COUNTDOWN_TICKS ||
    Math.ceil(ticks / DIGIT_PERIOD_TICKS) !== Math.ceil((ticks + 1) / DIGIT_PERIOD_TICKS);
  const events: SimEvent[] = isNewDigit
    ? [{ kind: 'countdown', digit: countdownDigit(ticks) }]
    : [];
  const tick = state.tick + 1;
  if (ticks > 1) {
    return { state: { ...state, tick, countdownTicks: ticks - 1 }, events };
  }
  events.push({ kind: 'go' });
  const spawnSeconds = TUNING.firstSpawnDelaySeconds;
  return {
    state: { ...state, tick, countdownTicks: 0, phase: 'playing', spawnSeconds },
    events,
  };
}

/** The last seconds tick once each, when their second begins. */
function timeTickEvents(remainingTicks: number): readonly SimEvent[] {
  const left = Math.ceil(remainingTicks / SIM_STEP_HZ);
  const before = Math.ceil((remainingTicks + 1) / SIM_STEP_HZ);
  return left !== before && left <= TUNING.timeWarningSeconds
    ? [{ kind: 'time-tick', secondsLeft: left }]
    : [];
}

/** Playing phase: round clock, spawn, then item advance and resolution in ascending id order. */
function playStep(state: BugHuntState, dt: number): StepResult {
  const playTicks = state.playTicks + 1;
  const tick = state.tick + 1;
  const remainingTicks = ROUND_TICKS - playTicks;
  if (remainingTicks <= 0) {
    const ended: BugHuntState = { ...state, tick, playTicks, phase: 'ended', items: [] };
    return {
      state: ended,
      events: [{ kind: 'round-end', score: state.score, stats: state.stats }],
    };
  }
  const spawn = advanceSpawn({ ...state, playTicks }, dt);
  const spawnEvents: readonly SimEvent[] =
    spawn.spawned === undefined
      ? []
      : [{ kind: 'spawn', itemId: spawn.spawned.id, itemKind: spawn.spawned.kind }];
  const resolution = resolveItems(advanceItems(spawn.items, dt), {
    score: state.score,
    streak: state.streak,
    multiplier: state.multiplier,
    cat: state.cat,
    stats: state.stats,
    items: [],
    events: [...timeTickEvents(remainingTicks), ...spawnEvents],
  });
  const { events, ...resolved } = resolution;
  const next: BugHuntState = { ...state, ...resolved, tick, playTicks, ...spawnState(spawn) };
  return { state: next, events };
}

/** The parts of the state the spawn step owns. */
function spawnState(
  spawn: SpawnOutcome,
): Pick<BugHuntState, 'spawnSeconds' | 'nextItemId' | 'rng'> {
  return { spawnSeconds: spawn.spawnSeconds, nextItemId: spawn.nextItemId, rng: spawn.rng };
}

/** One pure, deterministic simulation step; `dt` must equal SIM_STEP_SECONDS (else throws). */
export function step(state: BugHuntState, input: BugHuntInput, dt: number): StepResult {
  if (dt !== SIM_STEP_SECONDS) {
    throw new Error(`bug-hunt step: dt must be ${SIM_STEP_SECONDS} s, got ${dt}`);
  }
  if (state.phase === 'ended') {
    return { state: { ...state, tick: state.tick + 1 }, events: [] };
  }
  const moved: BugHuntState = { ...state, cat: updateCat(state.cat, input, dt) };
  return moved.phase === 'countdown' ? countdownStep(moved) : playStep(moved, dt);
}
