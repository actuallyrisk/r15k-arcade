import { SIM_STEP_SECONDS } from '@r15k/engine';
import { TUNING } from '../content/tuning.ts';
import { botAimX, botTarget, escapeDirection, threateningBomb } from './bot-target.ts';
import { NO_INPUT } from './input.ts';
import type { BugHuntInput } from './input.ts';
import type { BugHuntState } from './state.ts';

/**
 * Deterministic bot input (replays now, attract mode later): keyboard-style moves that leave a bomb
 * overlapping the cat late in its fall, otherwise chase the lowest reachable bug, stop within the dead
 * zone and wait instead of stepping under such a bomb. Uses no random numbers.
 */
export function botInput(state: BugHuntState): BugHuntInput {
  const { cat } = state;
  const bomb = threateningBomb(state, cat.x);
  if (bomb !== undefined) {
    return { move: escapeDirection(cat, bomb), aimX: undefined };
  }
  const target = botTarget(state, TUNING.cat.keyboardSpeed);
  if (target === undefined) {
    return NO_INPUT;
  }
  const distance = botAimX(target) - cat.x;
  if (Math.abs(distance) <= TUNING.bot.deadZone) {
    return NO_INPUT;
  }
  const move = distance < 0 ? -1 : 1;
  const nextX = cat.x + move * TUNING.cat.keyboardSpeed * SIM_STEP_SECONDS;
  return threateningBomb(state, nextX) === undefined ? { move, aimX: undefined } : NO_INPUT;
}
