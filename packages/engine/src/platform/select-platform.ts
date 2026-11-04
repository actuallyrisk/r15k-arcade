import { isTauri } from '@tauri-apps/api/core';
import type { Logger } from '../logger/logger.ts';
import type { Platform } from './platform-types.ts';
import { createTauriPlatform } from './tauri-platform.ts';
import { createWebPlatform } from './web-platform.ts';

/** What a platform implementation needs. */
export interface PlatformContext {
  readonly window: Window;
  readonly logger: Logger;
}

/** The Tauri platform inside the app shell, else the web platform; decided once at boot. */
export async function selectPlatform(context: PlatformContext): Promise<Platform> {
  if (isTauri()) {
    return await createTauriPlatform(context);
  }
  return createWebPlatform(context);
}
