import { invoke } from '@tauri-apps/api/core';
import type { Logger } from '../logger/logger.ts';
import { createTauriStoreAdapter } from '../storage/tauri-store-adapter.ts';
import { DEVICE_COMMANDS } from './device-plugin.ts';
import { UNAVAILABLE_TOGGLE } from './platform-types.ts';
import type {
  AllowedUrl,
  BackButtonCapability,
  FullscreenCapability,
  OperatingSystem,
  Platform,
  ToggleCapability,
  WindowRevealCapability,
} from './platform-types.ts';
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

/** The window methods the platform uses (from @tauri-apps/api/window). */
interface AppWindow {
  setFullscreen(isFullscreen: boolean): Promise<void>;
  isFullscreen(): Promise<boolean>;
  show(): Promise<void>;
}

/** A registered back-button listener. */
interface BackButtonListener {
  unregister(): Promise<void>;
}

/** `onBackButtonPress` of @tauri-apps/api/app: registering takes over the default (closing the app). */
type BackButtonRegistrar = (handler: () => void) => Promise<BackButtonListener>;

const OPERATING_SYSTEMS: readonly OperatingSystem[] = [
  'android',
  'ios',
  'macos',
  'windows',
  'linux',
];

function toOperatingSystem(name: string): OperatingSystem {
  return OPERATING_SYSTEMS.find((os) => os === name) ?? 'unknown';
}

/** Runs a platform call; a failure is logged, never thrown (the game goes on without it). */
async function guarded(
  operation: () => Promise<unknown>,
  message: string,
  logger: Logger,
): Promise<void> {
  try {
    await operation();
  } catch (error: unknown) {
    logger.warn(message, error);
  }
}

/** A toggle backed by a device-plugin command; after one rejected invoke it reports unavailable. */
function deviceToggle(command: string, logger: Logger): ToggleCapability {
  let isAvailable = true;
  return {
    get isAvailable(): boolean {
      return isAvailable;
    },
    async set(isOn: boolean): Promise<void> {
      if (!isAvailable) {
        return;
      }
      try {
        // Wire key `enabled`, read by the Kotlin and Swift plugin classes.
        await invoke(command, { enabled: isOn });
      } catch (error: unknown) {
        isAvailable = false;
        logger.warn(`${command} failed; the feature stays off from now on`, error);
      }
    },
  };
}

/** The JavaScript fullscreen shortcut per desktop OS (macOS uses the native menu item ⌃⌘F). */
function fullscreenShortcut(os: OperatingSystem): FullscreenCapability['shortcut'] {
  switch (os) {
    case 'windows':
    case 'linux':
      return 'f11';
    case 'macos':
      return 'native-menu';
    case 'android':
    case 'ios':
    case 'unknown':
      return 'none';
  }
}

function fullscreenFor(
  os: OperatingSystem,
  appWindow: () => AppWindow,
  logger: Logger,
): FullscreenCapability {
  if (os === 'android' || os === 'ios') {
    return UNAVAILABLE_FULLSCREEN;
  }
  const toggle = async (): Promise<void> => {
    const current = appWindow();
    await current.setFullscreen(!(await current.isFullscreen()));
  };
  return {
    isAvailable: true,
    shortcut: fullscreenShortcut(os),
    toggle: () => guarded(toggle, 'fullscreen could not be toggled', logger),
  };
}

function androidBackButton(register: BackButtonRegistrar, logger: Logger): BackButtonCapability {
  return {
    isAvailable: true,
    subscribe(listener: () => void): () => void {
      const registration = register(() => {
        listener();
      }).catch((error: unknown) => {
        logger.warn('the back button listener could not be registered', error);
        return undefined;
      });
      return () => {
        void registration.then((handle) =>
          guarded(
            () => handle?.unregister() ?? Promise.resolve(),
            'the back button listener could not be removed',
            logger,
          ),
        );
      };
    },
    moveToBackground: () =>
      guarded(
        () => invoke(DEVICE_COMMANDS.moveToBackground),
        'the app could not move to the background',
        logger,
      ),
  };
}

function windowRevealFor(
  isMobile: boolean,
  appWindow: () => AppWindow,
  logger: Logger,
): WindowRevealCapability {
  if (isMobile) {
    return UNAVAILABLE_WINDOW_REVEAL;
  }
  return {
    isAvailable: true,
    show: () => guarded(() => appWindow().show(), 'the window could not be shown', logger),
  };
}

/**
 * The platform inside the Tauri shell: store plugin storage, the device plugin on Android and iOS,
 * fullscreen and window reveal on desktop, the back button on Android.
 */
export async function createTauriPlatform(context: PlatformContext): Promise<Platform> {
  const { logger } = context;
  const { platform } = await import('@tauri-apps/plugin-os');
  const { openUrl } = await import('@tauri-apps/plugin-opener');
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const { onBackButtonPress } = await import('@tauri-apps/api/app');
  const os = toOperatingSystem(platform());
  const isMobile = os === 'android' || os === 'ios';
  const isAndroid = os === 'android';
  return {
    kind: 'tauri',
    os,
    isStoreBuild: false,
    storage: await createTauriStoreAdapter('save'),
    haptics: UNAVAILABLE_HAPTICS,
    keepAwake: isMobile ? deviceToggle(DEVICE_COMMANDS.setKeepAwake, logger) : UNAVAILABLE_TOGGLE,
    // iOS hides the status bar through Info.plist; desktop windows have no system bars to hide.
    immersive: isAndroid ? deviceToggle(DEVICE_COMMANDS.setImmersive, logger) : UNAVAILABLE_TOGGLE,
    fullscreen: fullscreenFor(os, getCurrentWindow, logger),
    posture: createWebPosture(context.window),
    openUrl: {
      isAvailable: true,
      open: (url: AllowedUrl) =>
        guarded(() => openUrl(url), 'the link could not be opened', logger),
    },
    backButton: isAndroid ? androidBackButton(onBackButtonPress, logger) : UNAVAILABLE_BACK_BUTTON,
    windowReveal: windowRevealFor(isMobile, getCurrentWindow, logger),
    share: UNAVAILABLE_SHARE,
    gamesServices: UNAVAILABLE_GAMES_SERVICES,
    tips: UNAVAILABLE_TIPS,
  };
}
