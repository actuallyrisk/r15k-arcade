import type { Logger } from '@r15k/engine';

/** Runs a platform call in the background; a rejection is logged, never left unhandled. */
export function settle(promise: Promise<void>, logger: Logger, what: string): void {
  promise.catch((error: unknown) => {
    logger.warn(`${what} failed`, error);
  });
}
