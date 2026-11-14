/** Durations of one intro mode (an entry of INTRO_TIMING). */
export interface IntroTiming {
  readonly gameOverSeconds: number;
  readonly continueFrom: number;
  readonly digitSeconds: number;
  readonly insertCoinSeconds: number;
}

/** What the intro shows at a point in time. */
export type IntroStage =
  | { readonly kind: 'game-over' }
  | { readonly kind: 'continue'; readonly digit: number }
  | { readonly kind: 'insert-coin'; readonly secondsIn: number }
  | { readonly kind: 'done' };

/** Total length of an intro mode in seconds (full ≈ 9.3 s, short ≈ 2.1 s). */
export function introDuration(timing: IntroTiming): number {
  const digits = timing.continueFrom + 1;
  return timing.gameOverSeconds + digits * timing.digitSeconds + timing.insertCoinSeconds;
}

/** The stage at `elapsed` seconds: GAME OVER → CONTINUE? n … 0 → INSERT COIN → done. */
export function introStage(timing: IntroTiming, elapsed: number): IntroStage {
  if (elapsed < timing.gameOverSeconds) {
    return { kind: 'game-over' };
  }
  const counting = elapsed - timing.gameOverSeconds;
  const digits = timing.continueFrom + 1;
  if (counting < digits * timing.digitSeconds) {
    return {
      kind: 'continue',
      digit: timing.continueFrom - Math.floor(counting / timing.digitSeconds),
    };
  }
  const coin = counting - digits * timing.digitSeconds;
  return coin < timing.insertCoinSeconds
    ? { kind: 'insert-coin', secondsIn: coin }
    : { kind: 'done' };
}

/** A key that changes exactly when a new digit or a new stage begins (drives the intro sounds). */
export function stageKey(stage: IntroStage): string {
  return stage.kind === 'continue' ? `continue-${stage.digit}` : stage.kind;
}
