import type { PostureInfo } from '../layout/layout-types.ts';
import { createMemoryStorageAdapter } from '../storage/memory-storage-adapter.ts';
import { createEmitter } from '../util/emitter.ts';
import type {
  CapabilityName,
  OperatingSystem,
  Platform,
  PostureCapability,
} from './platform-types.ts';

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

/** Records one call and resolves at once. */
type Recorder = (capability: FakePlatformCallName, argument: unknown) => Promise<void>;

/** The device capabilities; their methods only record their calls. */
function deviceCapabilities(
  isAvailable: (name: CapabilityName) => boolean,
  record: Recorder,
): Pick<Platform, 'haptics' | 'keepAwake' | 'immersive' | 'fullscreen'> {
  return {
    haptics: {
      isAvailable: isAvailable('haptics'),
      play: (pattern) => record('haptics.play', pattern),
    },
    keepAwake: {
      isAvailable: isAvailable('keepAwake'),
      set: (isOn) => record('keepAwake.set', isOn),
    },
    immersive: {
      isAvailable: isAvailable('immersive'),
      set: (isOn) => record('immersive.set', isOn),
    },
    fullscreen: {
      isAvailable: isAvailable('fullscreen'),
      shortcut: isAvailable('fullscreen') ? 'f11' : 'none',
      toggle: () => record('fullscreen.toggle', undefined),
    },
  };
}

/** The service capabilities; their methods only record their calls. */
function serviceCapabilities(
  isAvailable: (name: CapabilityName) => boolean,
  record: Recorder,
): Pick<Platform, 'openUrl' | 'windowReveal' | 'share' | 'gamesServices' | 'tips'> {
  return {
    openUrl: { isAvailable: isAvailable('openUrl'), open: (url) => record('openUrl.open', url) },
    windowReveal: {
      isAvailable: isAvailable('windowReveal'),
      show: () => record('windowReveal.show', undefined),
    },
    share: {
      isAvailable: isAvailable('share'),
      sharePng: (_png, text) => record('share.sharePng', text),
    },
    gamesServices: {
      isAvailable: isAvailable('gamesServices'),
      submitScore: (board, score) => record('gamesServices.submitScore', { board, score }),
    },
    tips: { isAvailable: isAvailable('tips') },
  };
}

/** A posture capability whose value the test sets; starts flat without segments. */
function fakePosture(isAvailable: boolean): {
  readonly capability: PostureCapability;
  readonly set: (info: PostureInfo) => void;
} {
  let current: PostureInfo = { posture: 'flat', segments: [] };
  const changes = createEmitter<PostureInfo>();
  return {
    capability: {
      isAvailable,
      current: () => current,
      subscribe: (listener) => changes.subscribe(listener),
    },
    set: (info) => {
      current = info;
      changes.emit(info);
    },
  };
}

/** Creates a fake platform; defaults: os 'unknown', memory storage, no capability available. */
export function createFakePlatform(
  options: {
    readonly os?: OperatingSystem;
    readonly availableCapabilities?: readonly CapabilityName[];
  } = {},
): FakePlatform {
  const available = new Set(options.availableCapabilities ?? []);
  const isAvailable = (name: CapabilityName): boolean => available.has(name);
  const calls: FakePlatformCall[] = [];
  const record: Recorder = (capability, argument) => {
    calls.push({ capability, argument });
    return Promise.resolve();
  };
  const posture = fakePosture(isAvailable('posture'));
  const backPresses = createEmitter<undefined>();
  return {
    kind: 'fake',
    os: options.os ?? 'unknown',
    isStoreBuild: false,
    storage: createMemoryStorageAdapter(),
    calls,
    ...deviceCapabilities(isAvailable, record),
    ...serviceCapabilities(isAvailable, record),
    posture: posture.capability,
    backButton: {
      isAvailable: isAvailable('backButton'),
      subscribe: (listener) => backPresses.subscribe(listener),
      moveToBackground: () => record('backButton.moveToBackground', undefined),
    },
    setPosture(info: PostureInfo): void {
      posture.set(info);
    },
    pressBack(): void {
      backPresses.emit(undefined);
    },
  };
}
