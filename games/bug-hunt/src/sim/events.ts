import type { ItemKind, Multiplier, SimStats } from './state.ts';

/** A countdown digit appeared. */
interface CountdownEvent {
  readonly kind: 'countdown';
  readonly digit: 1 | 2 | 3;
}

/** The round started. */
interface GoEvent {
  readonly kind: 'go';
}

/** One of the last seconds began (5…1). */
interface TimeTickEvent {
  readonly kind: 'time-tick';
  readonly secondsLeft: number;
}

/** An item spawned. */
interface SpawnEvent {
  readonly kind: 'spawn';
  readonly itemId: number;
  readonly itemKind: ItemKind;
}

/** A bug or golden bug was caught; `fall` is its progress after this step's advance. */
interface CatchEvent {
  readonly kind: 'catch';
  readonly itemId: number;
  readonly itemKind: 'bug' | 'golden';
  readonly points: number;
  readonly multiplier: Multiplier;
  /** The item's left edge in field px. */
  readonly x: number;
  readonly fall: number;
}

/** A bomb was caught; `penalty` is the nominal penalty, also when the score floor removed fewer points. */
interface BombEvent {
  readonly kind: 'bomb';
  readonly itemId: number;
  readonly penalty: number;
  readonly x: number;
  readonly fall: number;
}

/** A bug or golden bug reached the ground. */
interface MissEvent {
  readonly kind: 'miss';
  readonly itemId: number;
  readonly itemKind: 'bug' | 'golden';
  readonly x: number;
}

/** A bomb reached the ground. */
interface DodgeEvent {
  readonly kind: 'dodge';
  readonly itemId: number;
  readonly x: number;
}

/** The combo reached a new stage. */
interface ComboStageEvent {
  readonly kind: 'combo-stage';
  readonly multiplier: 2 | 3 | 4;
}

/** The combo was reset from a stage above 1×. */
interface ComboResetEvent {
  readonly kind: 'combo-reset';
  readonly previous: 2 | 3 | 4;
}

/** The round ended. */
interface RoundEndEvent {
  readonly kind: 'round-end';
  readonly score: number;
  readonly stats: SimStats;
}

/** Everything a step can report to the view, audio and accessibility layer. */
export type SimEvent =
  | CountdownEvent
  | GoEvent
  | TimeTickEvent
  | SpawnEvent
  | CatchEvent
  | BombEvent
  | MissEvent
  | DodgeEvent
  | ComboStageEvent
  | ComboResetEvent
  | RoundEndEvent;
