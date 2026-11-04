/** Input of one simulation step. */
export interface BugHuntInput {
  /** Held direction (keyboard/gamepad). */
  readonly move: -1 | 0 | 1;
  /** New pointer aim this step (cat left x, integer 0…216). */
  readonly aimX: number | undefined;
}

/** A step without input. */
export const NO_INPUT: BugHuntInput = { move: 0, aimX: undefined };
