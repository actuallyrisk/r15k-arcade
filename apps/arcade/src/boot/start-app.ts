import {
  A11yMirror,
  AudioMixer,
  DEFAULT_BINDINGS,
  detectInitialDevice,
  GameLoop,
  InputManager,
  SceneStack,
  setAmbientAudioSession,
  ViewportWatcher,
} from '@r15k/engine';
import type {
  A11yEvent,
  Clock,
  FrameScheduler,
  LifecycleMonitor,
  Logger,
  Platform,
  SaveStore,
  Translator,
} from '@r15k/engine';
import { BUG_HUNT_GAME } from '@r15k/bug-hunt';
import { getUiFonts } from '@r15k/ui';
import type { UiFonts } from '@r15k/ui';
import type { SaveDocumentV1 } from '../save/save-schema.ts';
import type { AppNavigation } from '../scenes/navigation.ts';
import { resolveSettings } from '../settings/settings-model.ts';
import type { AppElements } from './app-dom.ts';
import type { ResolvedSettings } from './app-services.ts';
import { translatorFor } from './app-translator.ts';
import { finishBoot } from './app-wiring.ts';
import type { CreateAppOptions } from './create-app.ts';
import { createDisplay } from './display.ts';
import type { Display } from './display.ts';
import { createEnvironmentWatcher } from './environment.ts';
import type { EnvironmentWatcher } from './environment.ts';
import { createErrorBoundary, listenForWindowErrors } from './error-boundary.ts';
import type { ErrorBoundary } from './error-boundary.ts';
import { showFatalError } from './fatal-error.ts';
import { createFrameDriver } from './frame-driver.ts';
import { createPaletteController } from './palette-controller.ts';
import type { PaletteController } from './palette-controller.ts';
import { createTransitionDriver } from './transition.ts';
import type { TransitionDriver } from './transition.ts';

/** What createApp built before the synchronous part of the boot. */
export interface AppCore {
  readonly options: CreateAppOptions;
  readonly elements: AppElements;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly scheduler: FrameScheduler;
  readonly platform: Platform;
  readonly save: SaveStore<SaveDocumentV1>;
}

/** The parts of the app that change while it runs or exist only later in the boot. */
export interface LiveState {
  resolved: ResolvedSettings;
  translator: Translator;
  navigation: AppNavigation | undefined;
  loop: GameLoop | undefined;
  lifecycle: LifecycleMonitor | undefined;
}

/** Everything built in steps 4–10 of the boot sequence. */
export interface AppParts {
  readonly core: AppCore;
  readonly live: LiveState;
  readonly environment: EnvironmentWatcher;
  readonly fonts: UiFonts;
  readonly viewport: ViewportWatcher;
  readonly display: Display;
  readonly a11yQueue: A11yEvent[];
  readonly mirror: A11yMirror;
  readonly mixer: AudioMixer;
  readonly input: InputManager;
  readonly stack: SceneStack;
  readonly transition: TransitionDriver;
  readonly loop: GameLoop;
  readonly palette: PaletteController;
  readonly boundary: ErrorBoundary;
  readonly wake: () => void;
}

/** Steps 5–6: viewport, layout, framebuffer and presenter; the mirror layer and its event queue. */
function createScreen(
  core: AppCore,
  wake: () => void,
): Pick<AppParts, 'viewport' | 'display' | 'a11yQueue' | 'mirror'> {
  const { window, document } = core.options;
  const { elements } = core;
  const viewport = new ViewportWatcher({
    window,
    stage: elements.stage,
    safeAreaProbes: elements.safeAreaProbes,
    posture: core.platform.posture,
  });
  const display = createDisplay({
    canvas: elements.canvas,
    document,
    snapshot: viewport.current(),
    playfield: BUG_HUNT_GAME.playfield,
  });
  const a11yQueue: A11yEvent[] = [];
  const mirror = new A11yMirror({
    root: elements.a11yRoot,
    document,
    toCss: (rect) => display.toCss(rect),
    onEvent: (event) => {
      a11yQueue.push(event);
      wake();
    },
  });
  return { viewport, display, a11yQueue, mirror };
}

/** Step 7: the ambient audio session and the mixer (interruptions auto-pause through the lifecycle). */
function createMixer(core: AppCore, live: LiveState): AudioMixer {
  setAmbientAudioSession(core.options.window.navigator);
  return new AudioMixer({
    // Created at boot: decoding works before a gesture; the context starts once the input unlocks it.
    createContext: () => (typeof AudioContext === 'function' ? new AudioContext() : undefined),
    logger: core.logger,
    onInterrupted: () => {
      live.lifecycle?.report('audio-interrupted');
    },
  });
}

/** Step 8: the input manager; activations unlock the audio (counted for the E2E hook). */
function createInput(
  core: AppCore,
  context: { readonly display: Display; readonly mixer: AudioMixer; readonly wake: () => void },
): InputManager {
  const { window } = core.options;
  const { display, mixer } = context;
  const input = new InputManager({
    window,
    surface: core.elements.stage,
    clock: core.clock,
    bindings: DEFAULT_BINDINGS,
    toLogical: (point) => display.toLogical(point),
    cssPerLogical: () => display.layout.cssPerLogical,
    initialDevice: detectInitialDevice(window, core.platform.os),
    isFullscreenShortcutEnabled: core.platform.fullscreen.shortcut === 'f11',
  });
  let unlockCalls = 0;
  const stopUnlock = input.onUserActivation(() => {
    unlockCalls += 1;
    mixer.unlock();
    if (mixer.hasRunOnce) {
      stopUnlock();
    }
  });
  input.onGamepadButton(() => {
    mixer.unlock();
  });
  input.onActivity(context.wake);
  if (core.options.isE2eBuild) {
    Object.assign(window, { __r15kE2e: { unlockCalls: () => unlockCalls } });
  }
  return input;
}

/** The error boundary; the window's own errors go to it as well. */
function createBoundary(core: AppCore, live: LiveState): ErrorBoundary {
  const boundary = createErrorBoundary({
    logger: core.logger,
    clock: core.clock,
    navigation: () => live.navigation,
    wake: () => {
      live.loop?.wake();
    },
    onBootError: (error) => {
      showFatalError(core.options.document, error);
    },
  });
  listenForWindowErrors(core.options.window, boundary);
  return boundary;
}

/** Step 9: the scene stack, the dissolve and the loop with the frame driver. */
function createEngine(
  parts: Omit<AppParts, 'stack' | 'transition' | 'loop'>,
): Pick<AppParts, 'stack' | 'transition' | 'loop'> {
  const { core, live, boundary } = parts;
  const stack = new SceneStack({
    logger: core.logger,
    onSceneError: (error) => {
      boundary.handleFatal(error);
    },
  });
  const transition = createTransitionDriver({
    isReducedMotion: () => live.resolved.isReducedMotion,
  });
  const hooks = createFrameDriver({
    ...parts,
    stack,
    transition,
    platform: core.platform,
    logger: core.logger,
    i18n: () => live.translator,
    isReducedMotion: () => live.resolved.isReducedMotion,
    onError: (error) => {
      boundary.handleFatal(error);
    },
    onFirstPresent: () => {
      boundary.markPresented();
      void core.platform.windowReveal.show().catch((error: unknown) => {
        core.logger.warn('window reveal failed', error);
      });
    },
  });
  const loop = new GameLoop({ clock: core.clock, scheduler: core.scheduler, hooks });
  live.loop = loop;
  return { stack, transition, loop };
}

/** Steps 4–12 of the boot sequence (everything after the save document is loaded). */
export function startApp(core: AppCore): void {
  const { window, document } = core.options;
  const environment = createEnvironmentWatcher(window);
  const resolved = resolveSettings(core.save.get().settings, environment.current());
  const live: LiveState = {
    resolved,
    translator: translatorFor(resolved.locale),
    navigation: undefined,
    loop: undefined,
    lifecycle: undefined,
  };
  const wake = (): void => {
    live.loop?.wake();
  };
  const boundary = createBoundary(core, live);
  const fonts = getUiFonts();
  const screen = createScreen(core, wake);
  const mixer = createMixer(core, live);
  const input = createInput(core, { display: screen.display, mixer, wake });
  const palette = createPaletteController({ document, onChanged: wake });
  const base = { core, live, environment, fonts, ...screen, mixer, input, palette, boundary, wake };
  finishBoot({ ...base, ...createEngine(base) });
}
