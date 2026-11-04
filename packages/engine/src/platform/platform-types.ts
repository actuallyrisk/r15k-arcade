import type { PostureInfo } from '../layout/layout-types.ts';
import type { StorageAdapter } from '../storage/storage-adapter.ts';
import type { Unsubscribe } from '../util/emitter.ts';

/** Which implementation backs the platform. */
export type PlatformKind = 'tauri' | 'web' | 'fake';

/** Operating system the app runs on. */
export type OperatingSystem = 'android' | 'ios' | 'macos' | 'windows' | 'linux' | 'unknown';

/** Haptic feedback patterns. */
export type HapticPattern = 'tick' | 'double-tick' | 'heavy' | 'record';

/** The only URL the app ever opens (system browser). */
export type AllowedUrl = 'https://r15k.dev';

/** An on/off platform feature (keep-awake, immersive mode). */
export interface ToggleCapability {
  readonly isAvailable: boolean;
  set(isOn: boolean): Promise<void>;
}

/** Haptic feedback. */
export interface HapticsCapability {
  readonly isAvailable: boolean;
  play(pattern: HapticPattern): Promise<void>;
}

/** Fullscreen; windows/linux: F11 handled in JS, macOS: the native ⌃⌘F menu item. */
export interface FullscreenCapability {
  readonly isAvailable: boolean;
  readonly shortcut: 'f11' | 'native-menu' | 'none';
  toggle(): Promise<void>;
}

/** Device posture and display segments. */
export interface PostureCapability {
  readonly isAvailable: boolean;
  current(): PostureInfo;
  subscribe(listener: (info: PostureInfo) => void): Unsubscribe;
}

/** Opens the allowed URL in the system browser. */
export interface OpenUrlCapability {
  readonly isAvailable: boolean;
  open(url: AllowedUrl): Promise<void>;
}

/** System share sheet (a later milestone). */
export interface ShareCapability {
  readonly isAvailable: boolean;
  sharePng(png: Uint8Array, text: string): Promise<void>;
}

/** Game Center / Play Games (a later milestone). */
export interface GamesServicesCapability {
  readonly isAvailable: boolean;
  submitScore(board: string, score: number): Promise<void>;
}

/** Tip jar (a later milestone, store builds only). */
export interface TipsCapability {
  readonly isAvailable: boolean;
}

/** Android system back button / back gesture. While subscribed, the platform default (close the app) is off. */
export interface BackButtonCapability {
  readonly isAvailable: boolean;
  subscribe(listener: () => void): Unsubscribe;
  /** What back does at the hub (Android convention for a root screen). */
  moveToBackground(): Promise<void>;
}

/** Shows the main window after the first presented frame (desktop windows start hidden). */
export interface WindowRevealCapability {
  readonly isAvailable: boolean;
  show(): Promise<void>;
}

/** One interface for every platform service; unsupported capabilities report `isAvailable: false`. */
export interface Platform {
  readonly kind: PlatformKind;
  readonly os: OperatingSystem;
  /** False in this milestone. */
  readonly isStoreBuild: boolean;
  readonly storage: StorageAdapter;
  readonly haptics: HapticsCapability;
  readonly keepAwake: ToggleCapability;
  readonly immersive: ToggleCapability;
  readonly fullscreen: FullscreenCapability;
  readonly posture: PostureCapability;
  readonly openUrl: OpenUrlCapability;
  readonly backButton: BackButtonCapability;
  readonly windowReveal: WindowRevealCapability;
  readonly share: ShareCapability;
  readonly gamesServices: GamesServicesCapability;
  readonly tips: TipsCapability;
}

/** A toggle that is not available; `set()` resolves without doing anything. */
export const UNAVAILABLE_TOGGLE: ToggleCapability = {
  isAvailable: false,
  set(): Promise<void> {
    return Promise.resolve();
  },
};

/** The capability members of Platform (everything except kind, os, isStoreBuild and storage). */
export type CapabilityName = Exclude<keyof Platform, 'kind' | 'os' | 'isStoreBuild' | 'storage'>;
