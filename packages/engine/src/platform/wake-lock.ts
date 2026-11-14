// Keep-awake in browsers through the Screen Wake Lock API. Browsers release the lock whenever the page
// is hidden, so it is requested again when the page becomes visible while still wanted.
import type { Logger } from '../logger/logger.ts';
import { UNAVAILABLE_TOGGLE } from './platform-types.ts';
import type { ToggleCapability } from './platform-types.ts';

/** `navigator.wakeLock` is missing in older WebViews and insecure contexts. */
interface WakeLockNavigator {
  readonly wakeLock?: WakeLock;
}

/** Holds the screen wake lock while it is wanted. */
class WakeLockToggle implements ToggleCapability {
  readonly isAvailable = true;
  private readonly wakeLock: WakeLock;
  private readonly logger: Logger;
  private sentinel: WakeLockSentinel | undefined;
  private isWanted = false;

  constructor(wakeLock: WakeLock, window: Window, logger: Logger) {
    this.wakeLock = wakeLock;
    this.logger = logger;
    window.document.addEventListener('visibilitychange', () => {
      if (window.document.visibilityState === 'visible') {
        void this.acquireIfWanted();
      }
    });
  }

  /** Requests the lock (on) or releases it (off); refusals are logged, never thrown. */
  async set(isOn: boolean): Promise<void> {
    this.isWanted = isOn;
    if (isOn) {
      await this.acquireIfWanted();
      return;
    }
    const held = this.sentinel;
    this.sentinel = undefined;
    try {
      await held?.release();
    } catch (error: unknown) {
      this.logger.warn('screen wake lock could not be released', error);
    }
  }

  private async acquireIfWanted(): Promise<void> {
    if (!this.isWanted || (this.sentinel !== undefined && !this.sentinel.released)) {
      return;
    }
    try {
      this.sentinel = await this.wakeLock.request('screen');
    } catch (error: unknown) {
      this.logger.warn('screen wake lock was refused', error);
    }
  }
}

/** A keep-awake toggle on `navigator.wakeLock`, or the unavailable toggle without it. */
export function createWakeLockToggle(window: Window, logger: Logger): ToggleCapability {
  const navigator: WakeLockNavigator = window.navigator;
  return navigator.wakeLock === undefined
    ? UNAVAILABLE_TOGGLE
    : new WakeLockToggle(navigator.wakeLock, window, logger);
}
