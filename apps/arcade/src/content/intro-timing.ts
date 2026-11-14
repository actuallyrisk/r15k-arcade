/** Timing of the intro sequence in seconds. */
export const INTRO_TIMING = {
  /** Full intro (first launch or setting 'full'). */
  full: { gameOverSeconds: 1.5, continueFrom: 9, digitSeconds: 0.6, insertCoinSeconds: 1.8 },
  /** Short intro (default after the first launch). */
  short: { gameOverSeconds: 0.5, continueFrom: 3, digitSeconds: 0.25, insertCoinSeconds: 0.6 },
  /** Blink period of "INSERT COIN" (no blinking with reduced motion). */
  blinkPeriodSeconds: 0.8,
} as const;
