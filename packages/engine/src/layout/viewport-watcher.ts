import type { Insets, Size } from '../math/geometry.ts';
import type { PostureCapability } from '../platform/platform-types.ts';
import { createEmitter } from '../util/emitter.ts';
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

/** The window members the watcher uses that `Window` does not declare (constructors live on the global). */
type ObservedWindow = Window & {
  readonly ResizeObserver?: typeof ResizeObserver;
};

/** Whether two snapshots describe the same viewport. */
function isSameSnapshot(a: ViewportSnapshot, b: ViewportSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Observes size, device pixels, safe areas, orientation and posture, and reports viewport snapshots. */
export class ViewportWatcher {
  private readonly options: ViewportWatcherOptions;
  private readonly emitter = createEmitter<ViewportSnapshot>();
  private readonly cleanups: (() => void)[] = [];
  private devicePixelSize: Size | undefined;
  private isDeviceBoxObserved = false;
  private resolutionCleanup: (() => void) | undefined;
  private snapshot: ViewportSnapshot;

  constructor(options: ViewportWatcherOptions) {
    this.options = options;
    this.snapshot = this.read();
    this.observeSizes();
    this.observeOrientation();
    this.watchResolution();
    this.cleanups.push(
      options.posture.subscribe(() => {
        this.refresh();
      }),
    );
  }

  /** The latest snapshot. */
  current(): ViewportSnapshot {
    return this.snapshot;
  }

  /** Calls the listener with every new snapshot. */
  subscribe(listener: (snapshot: ViewportSnapshot) => void): Unsubscribe {
    return this.emitter.subscribe(listener);
  }

  /** Stops observing. */
  dispose(): void {
    this.resolutionCleanup?.();
    this.resolutionCleanup = undefined;
    for (const cleanup of this.cleanups.splice(0)) {
      cleanup();
    }
    this.emitter.clear();
  }

  /** Re-reads the viewport and notifies listeners when anything changed. */
  private refresh(): void {
    const next = this.read();
    if (isSameSnapshot(next, this.snapshot)) {
      return;
    }
    this.snapshot = next;
    this.emitter.emit(next);
  }

  private read(): ViewportSnapshot {
    const { window, stage } = this.options;
    const box = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    const device = this.devicePixelSize ?? {
      width: Math.round(box.width * dpr),
      height: Math.round(box.height * dpr),
    };
    return {
      cssWidth: box.width,
      cssHeight: box.height,
      devicePixelRatio: dpr,
      deviceWidth: device.width,
      deviceHeight: device.height,
      safeArea: this.readSafeArea(),
      posture: this.options.posture.current(),
    };
  }

  private readSafeArea(): Insets {
    const { top, right, bottom, left } = this.options.safeAreaProbes;
    return {
      top: top.getBoundingClientRect().height,
      right: right.getBoundingClientRect().width,
      bottom: bottom.getBoundingClientRect().height,
      left: left.getBoundingClientRect().width,
    };
  }

  /** ResizeObserver on the stage (device pixels where supported) and on each of the four probes. */
  private observeSizes(): void {
    const observerClass = (this.options.window as ObservedWindow).ResizeObserver;
    if (observerClass === undefined) {
      return;
    }
    const stageObserver = new observerClass((entries) => {
      this.takeDevicePixelSize(entries.at(-1));
      this.refresh();
    });
    this.isDeviceBoxObserved = this.observeStage(stageObserver);
    // A 180° rotation swaps the left and right insets without any size change, so each probe is
    // observed on its own.
    const probeObserver = new observerClass(() => {
      this.refresh();
    });
    const { top, right, bottom, left } = this.options.safeAreaProbes;
    for (const probe of [top, right, bottom, left]) {
      probeObserver.observe(probe, { box: 'border-box' });
    }
    this.cleanups.push(() => {
      stageObserver.disconnect();
      probeObserver.disconnect();
    });
  }

  /**
   * Observes the stage's device-pixel box; WebKit throws a TypeError for that box, so it falls back to
   * the content box, where `round(css × dpr)` is exact (Apple platforms have integer DPRs).
   */
  private observeStage(observer: ResizeObserver): boolean {
    try {
      observer.observe(this.options.stage, { box: 'device-pixel-content-box' });
      return true;
    } catch (_error: unknown) {
      observer.observe(this.options.stage, { box: 'content-box' });
      return false;
    }
  }

  private takeDevicePixelSize(entry: ResizeObserverEntry | undefined): void {
    // Engines without device-pixel boxes leave the property undefined, whatever the DOM types say.
    const sizes: readonly ResizeObserverSize[] | undefined = entry?.devicePixelContentBoxSize;
    const size = sizes?.[0];
    if (this.isDeviceBoxObserved && size !== undefined) {
      this.devicePixelSize = { width: size.inlineSize, height: size.blockSize };
    }
  }

  private observeOrientation(): void {
    const { window } = this.options;
    const onChange = (): void => {
      this.refresh();
    };
    const orientation = (window.screen as Partial<Screen>).orientation;
    if (orientation === undefined) {
      window.addEventListener('orientationchange', onChange);
      window.addEventListener('resize', onChange);
      this.cleanups.push(() => {
        window.removeEventListener('orientationchange', onChange);
        window.removeEventListener('resize', onChange);
      });
      return;
    }
    orientation.addEventListener('change', onChange);
    this.cleanups.push(() => {
      orientation.removeEventListener('change', onChange);
    });
  }

  /** A media query that matches the current DPR exactly; it changes when the window moves screens or zooms. */
  private watchResolution(): void {
    const { window } = this.options;
    const query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const onChange = (): void => {
      this.resolutionCleanup?.();
      this.watchResolution();
      this.refresh();
    };
    query.addEventListener('change', onChange);
    this.resolutionCleanup = () => {
      query.removeEventListener('change', onChange);
    };
  }
}
