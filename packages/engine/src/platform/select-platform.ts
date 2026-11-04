import type { Logger } from '../logger/logger.ts';
import { notImplemented } from '../util/assert.ts';
import type { Platform } from './platform-types.ts';

/** What a platform implementation needs. */
export interface PlatformContext {
  readonly window: Window;
  readonly logger: Logger;
}

/** The Tauri platform inside the app shell, else the web platform; decided once at boot. */
export function selectPlatform(_context: PlatformContext): Promise<Platform> {
  return notImplemented('engine.selectPlatform');
}
