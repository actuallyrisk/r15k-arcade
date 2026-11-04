import type { PostureInfo } from '../layout/layout-types.ts';
import { notImplemented } from '../util/assert.ts';
import type { CapabilityName, OperatingSystem, Platform } from './platform-types.ts';

/** Every recorded method of the fake platform. */
export type FakePlatformCallName =
  | 'haptics.play'
  | 'keepAwake.set'
  | 'immersive.set'
  | 'fullscreen.toggle'
  | 'openUrl.open'
  | 'backButton.moveToBackground'
  | 'windowReveal.show'
  | 'share.sharePng'
  | 'gamesServices.submitScore';

/** One recorded method call. */
export interface FakePlatformCall {
  readonly capability: FakePlatformCallName;
  readonly argument: unknown;
}

/** A platform for tests that records every call. */
export interface FakePlatform extends Platform {
  /** Every method call in order, available or not. */
  readonly calls: readonly FakePlatformCall[];
  /** Updates posture.current() and notifies subscribers. */
  setPosture(info: PostureInfo): void;
  /** Calls every backButton subscriber (Android back button). */
  pressBack(): void;
}

/** Creates a fake platform; defaults: os 'unknown', memory storage, no capability available. */
export function createFakePlatform(_options?: {
  readonly os?: OperatingSystem;
  readonly availableCapabilities?: readonly CapabilityName[];
}): FakePlatform {
  return notImplemented('engine.createFakePlatform');
}
