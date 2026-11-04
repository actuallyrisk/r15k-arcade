import { SIM_STEP_SECONDS } from '@r15k/engine';
import { createInitialState } from '../create.ts';
import type { SimEvent } from '../events.ts';
import type { BugHuntInput } from '../input.ts';
import { NO_INPUT } from '../input.ts';
import type { BugHuntState, Cat, Item } from '../state.ts';
import { step } from '../step.ts';

/** One simulation step in seconds (the only `dt` the step accepts). */
export const DT: number = SIM_STEP_SECONDS;

/** A playing state of seed 7 without items and with a spawn timer that does not run out soon. */
export function playingState(overrides: Partial<BugHuntState> = {}): BugHuntState {
  const initial = createInitialState({ seed: 7, mode: 'arcade' });
  return {
    ...initial,
    phase: 'playing',
    countdownTicks: 0,
    playTicks: 600,
    spawnSeconds: 10,
    ...overrides,
  };
}

/** The cat of a playing state with some fields replaced. */
export function catWith(overrides: Partial<Cat>): Cat {
  return { ...playingState().cat, ...overrides };
}

/** A bug falling one full fall per second, with some fields replaced. */
export function makeItem(overrides: Partial<Item> & Pick<Item, 'id'>): Item {
  return { kind: 'bug', x: 100, fall: 0, fallSeconds: 1, animSeconds: 0, ...overrides };
}

/** Freezes a value and everything it references, so any mutation throws. */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

/** Runs `count` steps with one input and collects every event with the tick it happened in. */
export function runSteps(
  state: BugHuntState,
  count: number,
  input: BugHuntInput = NO_INPUT,
): { readonly state: BugHuntState; readonly events: readonly (SimEvent & { tick: number })[] } {
  let current = state;
  const events: (SimEvent & { tick: number })[] = [];
  for (let index = 0; index < count; index += 1) {
    const result = step(current, input, DT);
    events.push(...result.events.map((event) => ({ ...event, tick: current.tick })));
    current = result.state;
  }
  return { state: current, events };
}
