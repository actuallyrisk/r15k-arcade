import { clamp } from '@r15k/engine';
import { TUNING } from '../content/tuning.ts';
import { CAT_MAX_X } from './derived.ts';
import type { BugHuntInput } from './input.ts';
import type { Cat } from './state.ts';

/** Position, direction and pointer aim of the cat after one movement step. */
interface Motion {
  readonly x: number;
  readonly facing: -1 | 1;
  readonly isMoving: boolean;
  readonly aimX: number | undefined;
}

/** Normalizes a pointer aim to an integer left edge inside the field. */
export function normalizeAimX(aimX: number): number {
  return clamp(Math.round(aimX), 0, CAT_MAX_X);
}

/** Follows the pointer aim at pointer speed; arriving snaps onto the aim and ends the movement. */
function followAim(cat: Cat, aimX: number, dt: number): Motion {
  const distance = aimX - cat.x;
  const maxStep = TUNING.cat.pointerSpeed * dt;
  if (Math.abs(distance) <= maxStep) {
    const facing = distance < 0 ? -1 : distance > 0 ? 1 : cat.facing;
    return { x: aimX, facing, isMoving: false, aimX: undefined };
  }
  const direction = distance < 0 ? -1 : 1;
  return { x: cat.x + direction * maxStep, facing: direction, isMoving: true, aimX };
}

/** Keyboard moves win over the pointer aim; without either the cat stands still. */
function moveCat(cat: Cat, move: -1 | 0 | 1, dt: number): Motion {
  if (move !== 0) {
    const x = clamp(cat.x + move * TUNING.cat.keyboardSpeed * dt, 0, CAT_MAX_X);
    return { x, facing: move, isMoving: true, aimX: undefined };
  }
  if (cat.aimX !== undefined) {
    return followAim(cat, cat.aimX, dt);
  }
  return { x: cat.x, facing: cat.facing, isMoving: false, aimX: undefined };
}

/** The cat after the aim, movement and reaction-timer parts of a step (also during the countdown). */
export function updateCat(cat: Cat, input: BugHuntInput, dt: number): Cat {
  const aimed = input.aimX === undefined ? cat : { ...cat, aimX: normalizeAimX(input.aimX) };
  const motion = moveCat(aimed, input.move, dt);
  return {
    ...motion,
    moveSeconds: motion.isMoving ? cat.moveSeconds + dt : cat.moveSeconds,
    happySeconds: Math.max(0, cat.happySeconds - dt),
    startleSeconds: Math.max(0, cat.startleSeconds - dt),
  };
}
