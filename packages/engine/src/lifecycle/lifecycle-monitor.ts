import { createEmitter } from '../util/emitter.ts';
import type { Unsubscribe } from '../util/emitter.ts';

/** Why the app suspends (every reason auto-pauses a running round). */
export type SuspendReason =
  | 'hidden'
  | 'blur'
  | 'pagehide'
  | 'audio-interrupted'
  | 'posture-changed'
  | 'viewport-changed'
  | 'gamepad-disconnected';

/** The app lost the foreground, focus or a device. */
export interface SuspendEvent {
  readonly kind: 'suspend';
  readonly reason: SuspendReason;
}

/** The app is visible and focused again. */
export interface ResumeEvent {
  readonly kind: 'resume';
}

/** A lifecycle change. */
export type LifecycleEvent = SuspendEvent | ResumeEvent;

/**
 * Turns visibility, focus and page events (and reports of other producers) into lifecycle events. A
 * resume never restarts a round by itself: the round shows its pause overlay and the player resumes.
 */
export class LifecycleMonitor {
  private readonly document: Document;
  private readonly emitter = createEmitter<LifecycleEvent>();
  private readonly cleanups: (() => void)[] = [];

  constructor(options: { readonly window: Window; readonly document: Document }) {
    const { window, document } = options;
    this.document = document;
    const onVisibility = (): void => {
      this.emitter.emit(
        this.isVisible ? { kind: 'resume' } : { kind: 'suspend', reason: 'hidden' },
      );
    };
    const onBlur = (): void => {
      this.report('blur');
    };
    const onFocus = (): void => {
      this.emitter.emit({ kind: 'resume' });
    };
    const onPageHide = (): void => {
      this.report('pagehide');
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pagehide', onPageHide);
    this.cleanups.push(() => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pagehide', onPageHide);
    });
  }

  /** Calls the listener with every lifecycle event. */
  subscribe(listener: (event: LifecycleEvent) => void): Unsubscribe {
    return this.emitter.subscribe(listener);
  }

  /** For producers outside the DOM: mixer (interruption), layout (viewport/posture), input (gamepad). */
  report(reason: SuspendReason): void {
    this.emitter.emit({ kind: 'suspend', reason });
  }

  /** Whether the document is visible. */
  get isVisible(): boolean {
    return this.document.visibilityState === 'visible';
  }

  /** Removes every listener. */
  dispose(): void {
    for (const cleanup of this.cleanups.splice(0)) {
      cleanup();
    }
    this.emitter.clear();
  }
}
