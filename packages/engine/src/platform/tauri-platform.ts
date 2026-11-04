import { notImplemented } from '../util/assert.ts';
import type { Platform } from './platform-types.ts';
import type { PlatformContext } from './select-platform.ts';

/**
 * The platform inside the Tauri shell: store plugin storage, the device plugin on Android and iOS,
 * fullscreen and window reveal on desktop, the back button on Android.
 */
export function createTauriPlatform(_context: PlatformContext): Promise<Platform> {
  return notImplemented('engine.createTauriPlatform');
}
