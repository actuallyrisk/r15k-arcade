// Test harness of the arcade app: the real scene stack, navigation, dissolve, frame driver and loop on
// a manual 60 Hz scheduler, with a scripted input source, a fake platform, a fake audio context and a
// display that only holds the reference layout. It wires the Android back button like the app does.
import {
  AudioMixer,
  computeLayout,
  createDrawTarget,
  createFakeAudioContext,
  createFakeClock,
  createFakePlatform,
  createFramebuffer,
  createIdleInputFrame,
  createLogger,
  createManualScheduler,
  createMemorySink,
  createMemoryStorageAdapter,
  GameLoop,
  referenceSnapshot,
  SaveStore,
} from '@r15k/engine';
import type {
  A11yEvent,
  A11yMirror,
  Action,
  CapabilityName,
  FakePlatform,
  GameModule,
  InputFrame,
  LayoutResult,
  ManualScheduler,
  OperatingSystem,
  ReferenceViewportId,
  SceneStack,
} from '@r15k/engine';
import { BUG_HUNT_GAME } from '@r15k/bug-hunt';
import { getPaletteLut, getUiFonts } from '@r15k/ui';
import { vi } from 'vitest';
import type { AppServices } from '../boot/app-services.ts';
import { translatorFor } from '../boot/app-translator.ts';
import type { Display } from '../boot/display.ts';
import { createFrameDriver } from '../boot/frame-driver.ts';
import { createTransitionDriver } from '../boot/transition.ts';
import { ARCADE_SAVE_SCHEMA } from '../save/save-schema.ts';
import type { SaveDocumentV1 } from '../save/save-schema.ts';
import { createNavigation } from '../scenes/navigation.ts';
import type { AppNavigation } from '../scenes/navigation.ts';
import { resolveSettings } from '../settings/settings-model.ts';
import { createHarnessStack } from './harness-stack.ts';

/** One display frame at 60 Hz. */
const FRAME_MS = 1000 / 60;

/** A running test app. */
export interface AppHarness {
  readonly services: AppServices;
  readonly navigation: AppNavigation;
  readonly stack: SceneStack;
  readonly platform: FakePlatform;
  readonly mixer: AudioMixer;
  readonly loop: GameLoop;
  readonly a11yQueue: A11yEvent[];
  /** Errors of scenes and loop hooks (a test expects none). */
  readonly errors: readonly unknown[];
  /** Queues one input frame for the next poll. */
  press(...actions: readonly Action[]): void;
  /** Runs pending frames (one per call of the scheduler) while the loop keeps running, at most `count`. */
  frames(count: number): void;
  /** Whether a frame is scheduled. */
  readonly isRunning: boolean;
}

/** What a harness is built for. */
export interface HarnessOptions {
  readonly viewport?: ReferenceViewportId;
  readonly os?: OperatingSystem;
  readonly capabilities?: readonly CapabilityName[];
  readonly document?: SaveDocumentV1;
  readonly game?: GameModule;
  /** The mirror the frame driver syncs (default: a recording fake). */
  readonly mirror?: Pick<A11yMirror, 'sync' | 'announce'>;
}

/** An input frame with actions pressed once. */
export function pressedFrame(actions: readonly Action[]): InputFrame {
  const idle = createIdleInputFrame('keyboard');
  const pressed = { isHeld: true, wasPressed: true, wasReleased: false, pulses: 1 };
  const changes = Object.fromEntries(actions.map((action) => [action, pressed]));
  return { ...idle, actions: { ...idle.actions, ...changes } };
}

/** A display that holds a layout and a framebuffer and presents nothing. */
function fakeDisplay(layout: LayoutResult): Display {
  const target = createDrawTarget(createFramebuffer(layout.logical));
  return {
    layout,
    target,
    present: vi.fn(),
    toCss: (rect) => rect,
    toLogical: (point) => point,
    apply: () => ({ isViewportChange: false, isPostureChange: false }),
  };
}

/** The services of the harness (memory save store, fake mixer, settings applied in memory). */
function harnessServices(
  options: HarnessOptions,
  context: { readonly platform: FakePlatform; readonly mixer: AudioMixer },
): Omit<AppServices, 'navigation'> {
  const logger = createLogger({ isEnabled: false, sink: createMemorySink().sink });
  const save = new SaveStore({
    adapter: createMemoryStorageAdapter(),
    schema: ARCADE_SAVE_SCHEMA,
    key: 'save',
    logger,
  });
  const document = options.document;
  if (document !== undefined) {
    save.update(() => document);
  }
  const environment = {
    isDarkPreferred: false,
    isReducedMotionPreferred: false,
    languages: ['en'],
  };
  let resolved = resolveSettings(save.get().settings, environment);
  return {
    clock: createFakeClock(),
    logger,
    platform: context.platform,
    save,
    mixer: context.mixer,
    input: { setTextEntry: vi.fn() },
    i18n: () => translatorFor(resolved.locale),
    fonts: getUiFonts(),
    announce: vi.fn(),
    settings: () => resolved,
    updateSettings: (change) => {
      const settings = change(resolved.raw);
      save.update((stored) => ({ ...stored, settings }));
      resolved = resolveSettings(settings, environment);
    },
    appVersion: '9.9.9',
  };
}

/** The loop of the harness: the real frame driver on a manual scheduler. */
function harnessLoop(
  options: HarnessOptions,
  parts: {
    readonly base: Omit<AppServices, 'navigation'>;
    readonly platform: FakePlatform;
    readonly harness: ReturnType<typeof createHarnessStack>;
    readonly transition: ReturnType<typeof createTransitionDriver>;
    readonly a11yQueue: A11yEvent[];
  },
): { readonly loop: GameLoop; readonly scheduler: ManualScheduler } {
  const { base, harness } = parts;
  const layout = computeLayout(
    referenceSnapshot(options.viewport ?? 'desktop'),
    BUG_HUNT_GAME.playfield,
  );
  const scheduler = createManualScheduler();
  const hooks = createFrameDriver({
    ...parts,
    input: harness.input,
    stack: harness.stack,
    logger: base.logger,
    display: fakeDisplay(layout),
    palette: { lut: getPaletteLut('light'), apply: vi.fn() },
    mirror: options.mirror ?? { sync: vi.fn(), announce: vi.fn() },
    i18n: base.i18n,
    isReducedMotion: () => false,
    onError: (error) => {
      harness.errors.push(error);
    },
    onFirstPresent: vi.fn(),
  });
  return { loop: new GameLoop({ clock: base.clock, scheduler, hooks }), scheduler };
}

/** The fake platform and the mixer on a fake audio context. */
function harnessDevices(options: HarnessOptions): {
  readonly platform: FakePlatform;
  readonly mixer: AudioMixer;
} {
  const platform = createFakePlatform({
    os: options.os ?? 'unknown',
    availableCapabilities: options.capabilities ?? [],
  });
  const mixer = new AudioMixer({
    createContext: () => createFakeAudioContext(),
    logger: createLogger({ isEnabled: false, sink: createMemorySink().sink }),
    onInterrupted: vi.fn(),
  });
  return { platform, mixer };
}

/** Input and frame control of a harness: queued input wakes the loop, frames run at 60 Hz. */
function harnessControls(
  loop: GameLoop,
  context: { readonly scheduler: ManualScheduler; readonly inputs: InputFrame[] },
): Pick<AppHarness, 'press' | 'frames' | 'isRunning'> & {
  readonly push: (frame: InputFrame) => void;
} {
  const { scheduler, inputs } = context;
  let timeMs = 0;
  const push = (frame: InputFrame): void => {
    inputs.push(frame);
    loop.wake();
  };
  return {
    push,
    press: (...actions) => {
      push(pressedFrame(actions));
    },
    frames: (count) => {
      for (let frame = 0; frame < count && scheduler.pendingCount > 0; frame += 1) {
        timeMs += FRAME_MS;
        scheduler.runFrame(timeMs);
      }
    },
    get isRunning() {
      return scheduler.pendingCount > 0;
    },
  };
}

/** Builds the harness; the stack starts empty. */
export function createAppHarness(options: HarnessOptions = {}): AppHarness {
  const { platform, mixer } = harnessDevices(options);
  const base = harnessServices(options, { platform, mixer });
  const harness = createHarnessStack();
  const transition = createTransitionDriver({ isReducedMotion: () => false });
  const game = options.game ?? BUG_HUNT_GAME;
  const navigation = createNavigation(harness.stack, base, { transition, game });
  const a11yQueue: A11yEvent[] = [];
  const { loop, scheduler } = harnessLoop(options, {
    base,
    platform,
    harness,
    transition,
    a11yQueue,
  });
  const controls = harnessControls(loop, { scheduler, inputs: harness.inputs });
  platform.backButton.subscribe(() => {
    controls.push(pressedFrame(['back']));
  });
  return {
    services: { ...base, navigation },
    navigation,
    stack: harness.stack,
    errors: harness.errors,
    platform,
    mixer,
    loop,
    a11yQueue,
    press: controls.press,
    frames: controls.frames,
    get isRunning() {
      return controls.isRunning;
    },
  };
}
