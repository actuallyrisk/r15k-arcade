/** Holds the newest pointer aim of the frames since the last simulation step. */
export interface AimLatch {
  /** Stores an aim (a newer one replaces an older one); undefined keeps the stored aim. */
  offer(aimX: number | undefined): void;
  /** The stored aim for the next step, cleared on reading, so a tap reaches the simulation once. */
  take(): number | undefined;
  /** Forgets the stored aim (pause, cover). */
  clear(): void;
}

/**
 * A latch between the per-frame input mapping and the fixed steps: frames without a step (displays
 * above 120 Hz, frame jitter) never lose a tap, and frames with two steps never deliver it twice.
 */
export function createAimLatch(): AimLatch {
  let pending: number | undefined;
  return {
    offer(aimX) {
      if (aimX !== undefined) {
        pending = aimX;
      }
    },
    take() {
      const aimX = pending;
      pending = undefined;
      return aimX;
    },
    clear() {
      pending = undefined;
    },
  };
}
