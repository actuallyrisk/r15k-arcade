import { notImplemented } from '../util/assert.ts';
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

/** Turns visibility, focus and page events (and reports of other producers) into lifecycle events. */
export class LifecycleMonitor {
  constructor(_options: { readonly window: Window; readonly document: Document }) {
    return notImplemented('engine.LifecycleMonitor.constructor');
  }

  /** Calls the listener with every lifecycle event. */
  subscribe(_listener: (event: LifecycleEvent) => void): Unsubscribe {
    return notImplemented('engine.LifecycleMonitor.subscribe');
  }

  /** For producers outside the DOM: mixer (interruption), layout (viewport/posture), input (gamepad). */
  report(_reason: SuspendReason): void {
    return notImplemented('engine.LifecycleMonitor.report');
  }

  /** Whether the document is visible. */
  get isVisible(): boolean {
    return notImplemented('engine.LifecycleMonitor.isVisible');
  }

  /** Removes every listener. */
  dispose(): void {
    return notImplemented('engine.LifecycleMonitor.dispose');
  }
}
