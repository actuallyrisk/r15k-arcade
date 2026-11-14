import type { GameModeId, RngState } from '@r15k/engine';

/** Kind of a falling item. */
export type ItemKind = 'bug' | 'golden' | 'bomb';

/** Phase of a round. */
export type Phase = 'countdown' | 'playing' | 'ended';

/** Combo multiplier. */
export type Multiplier = 1 | 2 | 3 | 4;

/** A falling item. */
export interface Item {
  readonly id: number;
  readonly kind: ItemKind;
  /** Left edge, integer field px. */
  readonly x: number;
  /** Normalized fall progress 0…1. */
  readonly fall: number;
  /** Total fall time. */
  readonly fallSeconds: number;
  /** Wiggle phase (view). */
  readonly animSeconds: number;
}

/** The cat. */
export interface Cat {
  /** Left edge, 0…216 (float). */
  readonly x: number;
  readonly facing: -1 | 1;
  readonly isMoving: boolean;
  /** Accumulated while moving (run frames). */
  readonly moveSeconds: number;
  readonly aimX: number | undefined;
  readonly happySeconds: number;
  readonly startleSeconds: number;
}

/** Statistics collected by the simulation. */
export interface SimStats {
  readonly bugsCaught: number;
  readonly goldenCaught: number;
  readonly bombsCaught: number;
  readonly misses: number;
  readonly bombsDodged: number;
  readonly bestStreak: number;
}

/** The complete, immutable state of a round. */
export interface BugHuntState {
  readonly mode: GameModeId;
  readonly seed: number;
  readonly contentVersion: number;
  /** Steps since creation. */
  readonly tick: number;
  readonly phase: Phase;
  /** Remaining (216 → 0). */
  readonly countdownTicks: number;
  /** Elapsed while playing (0 → 7200). */
  readonly playTicks: number;
  /** Never negative. */
  readonly score: number;
  readonly streak: number;
  readonly multiplier: Multiplier;
  readonly cat: Cat;
  /** Ascending id. */
  readonly items: readonly Item[];
  readonly nextItemId: number;
  /** Until the next spawn. */
  readonly spawnSeconds: number;
  readonly rng: RngState;
  readonly stats: SimStats;
}
