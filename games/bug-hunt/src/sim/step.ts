import { notImplemented } from '@r15k/engine';
import type { SimEvent } from './events.ts';
import type { BugHuntInput } from './input.ts';
import type { BugHuntState } from './state.ts';

/** The state after one step and what happened in it. */
export interface StepResult {
  readonly state: BugHuntState;
  readonly events: readonly SimEvent[];
}

/** One pure, deterministic simulation step; `dt` must equal SIM_STEP_SECONDS (else throws). */
export function step(_state: BugHuntState, _input: BugHuntInput, _dt: number): StepResult {
  return notImplemented('bug-hunt.step');
}
