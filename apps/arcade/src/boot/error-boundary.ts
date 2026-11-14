import type { Clock, Logger } from '@r15k/engine';
import type { AppNavigation } from '../scenes/navigation.ts';

/** Errors closer together than this count as repeated (ms). */
const REPEAT_WINDOW_MS = 1000;

/** Catches every error of the running app and falls back to a safe state. */
export interface ErrorBoundary {
  handleFatal(error: unknown): void;
  /** The first frame is on screen: from now on errors lead to a safe scene, not the boot failure box. */
  markPresented(): void;
}

/** What the boundary needs; the navigation and the loop exist only later in the boot sequence. */
export interface ErrorBoundaryOptions {
  readonly logger: Logger;
  readonly clock: Clock;
  readonly navigation: () => AppNavigation | undefined;
  readonly wake: () => void;
  /** Shows the "could not start" box (errors before the first frame, or an error loop). */
  readonly onBootError: (error: unknown) => void;
}

/**
 * The error boundary: a running round pauses, any other scene returns to the hub; a second error within
 * 1 s resets to the hub without a transition; a third one within 1 s of that shows the failure box and
 * stops waking the loop, so a broken frame cannot spin forever. Errors are always logged (dev builds).
 */
export function createErrorBoundary(options: ErrorBoundaryOptions): ErrorBoundary {
  let hasPresented = false;
  let lastErrorMs: number | undefined;
  let repeats = 0;
  return {
    markPresented: () => {
      hasPresented = true;
    },
    handleFatal: (error) => {
      options.logger.error('unhandled error', error);
      const navigation = options.navigation();
      if (!hasPresented || navigation === undefined) {
        options.onBootError(error);
        return;
      }
      const now = options.clock.now();
      repeats = lastErrorMs !== undefined && now - lastErrorMs < REPEAT_WINDOW_MS ? repeats + 1 : 0;
      lastErrorMs = now;
      if (repeats >= 2) {
        options.onBootError(error);
        return;
      }
      if (repeats === 1) {
        navigation.resetToHub();
      } else if (navigation.hasActiveRound) {
        navigation.pauseRound('player');
      } else {
        navigation.toHub();
      }
      options.wake();
    },
  };
}

/** Routes uncaught window errors and unhandled rejections to the boundary. */
export function listenForWindowErrors(window: Window, boundary: ErrorBoundary): void {
  window.addEventListener('error', (event) => {
    boundary.handleFatal(event.error ?? event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    boundary.handleFatal(event.reason);
  });
}
