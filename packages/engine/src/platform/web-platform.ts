import { createLocalStorageAdapter } from '../storage/local-storage-adapter.ts';
import { createMemoryStorageAdapter } from '../storage/memory-storage-adapter.ts';
import type { StorageAdapter } from '../storage/storage-adapter.ts';
import { UNAVAILABLE_TOGGLE } from './platform-types.ts';
import type { AllowedUrl, Platform } from './platform-types.ts';
import { createWebPosture } from './posture-web.ts';
import type { PlatformContext } from './select-platform.ts';
import {
  UNAVAILABLE_BACK_BUTTON,
  UNAVAILABLE_FULLSCREEN,
  UNAVAILABLE_GAMES_SERVICES,
  UNAVAILABLE_HAPTICS,
  UNAVAILABLE_SHARE,
  UNAVAILABLE_TIPS,
  UNAVAILABLE_WINDOW_REVEAL,
} from './unavailable.ts';
import { createWakeLockToggle } from './wake-lock.ts';

/** Prefix of every key the browser build stores in localStorage. */
const STORAGE_PREFIX = 'r15k-arcade:';

/** localStorage, or memory when the browser blocks it (privacy settings, sandboxed frames). */
function webStorage(context: PlatformContext): StorageAdapter {
  try {
    return createLocalStorageAdapter(context.window.localStorage, STORAGE_PREFIX);
  } catch (error: unknown) {
    context.logger.warn('localStorage is blocked; this session is not saved', error);
    return createMemoryStorageAdapter();
  }
}

/**
 * The browser platform (dev and browser builds): localStorage storage, wake lock where present,
 * web posture, window.open for the allowed URL; every other capability is unavailable.
 */
export function createWebPlatform(context: PlatformContext): Platform {
  const { window, logger } = context;
  return {
    kind: 'web',
    os: 'unknown',
    isStoreBuild: false,
    storage: webStorage(context),
    haptics: UNAVAILABLE_HAPTICS,
    keepAwake: createWakeLockToggle(window, logger),
    immersive: UNAVAILABLE_TOGGLE,
    fullscreen: UNAVAILABLE_FULLSCREEN,
    posture: createWebPosture(window),
    openUrl: {
      isAvailable: true,
      open(url: AllowedUrl): Promise<void> {
        window.open(url, '_blank', 'noopener');
        return Promise.resolve();
      },
    },
    backButton: UNAVAILABLE_BACK_BUTTON,
    windowReveal: UNAVAILABLE_WINDOW_REVEAL,
    share: UNAVAILABLE_SHARE,
    gamesServices: UNAVAILABLE_GAMES_SERVICES,
    tips: UNAVAILABLE_TIPS,
  };
}
