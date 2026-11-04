import { notImplemented } from '../util/assert.ts';
import type { Platform } from './platform-types.ts';
import type { PlatformContext } from './select-platform.ts';

/**
 * The browser platform (dev and browser builds): localStorage storage, wake lock where present,
 * web posture, window.open for the allowed URL; every other capability is unavailable.
 */
export function createWebPlatform(_context: PlatformContext): Platform {
  return notImplemented('engine.createWebPlatform');
}
