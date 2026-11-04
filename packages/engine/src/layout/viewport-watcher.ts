import type { PostureCapability } from '../platform/platform-types.ts';
import { notImplemented } from '../util/assert.ts';
import type { Unsubscribe } from '../util/emitter.ts';
import type { ViewportSnapshot } from './layout-types.ts';

/** One element per safe-area inset, each sized by that inset alone. */
export interface SafeAreaProbes {
  readonly top: HTMLElement;
  readonly right: HTMLElement;
  readonly bottom: HTMLElement;
  readonly left: HTMLElement;
}

/** What the viewport watcher observes. */
export interface ViewportWatcherOptions {
  readonly window: Window;
  /** Full-viewport element observed with ResizeObserver. */
  readonly stage: HTMLElement;
  readonly safeAreaProbes: SafeAreaProbes;
  readonly posture: PostureCapability;
}

/** Observes size, device pixels, safe areas, orientation and posture, and reports viewport snapshots. */
export class ViewportWatcher {
  constructor(_options: ViewportWatcherOptions) {
    return notImplemented('engine.ViewportWatcher.constructor');
  }

  /** The latest snapshot. */
  current(): ViewportSnapshot {
    return notImplemented('engine.ViewportWatcher.current');
  }

  /** Calls the listener with every new snapshot. */
  subscribe(_listener: (snapshot: ViewportSnapshot) => void): Unsubscribe {
    return notImplemented('engine.ViewportWatcher.subscribe');
  }

  /** Stops observing. */
  dispose(): void {
    return notImplemented('engine.ViewportWatcher.dispose');
  }
}
