import { clearFramebuffer, createIdleInputFrame, SLOT } from '@r15k/engine';
import type {
  A11yEvent,
  A11yMirror,
  A11yTree,
  InputFrame,
  LayoutResult,
  Logger,
  LoopFrame,
  LoopHooks,
  Platform,
  SceneStack,
  Shortcut,
  Translator,
} from '@r15k/engine';
import { drawTooSmall } from '../scenes/too-small.ts';
import type { Display } from './display.ts';
import type { PaletteController } from './palette-controller.ts';
import { settle } from './settle.ts';
import type { TransitionDriver } from './transition.ts';

/** The input source the frame driver polls (the InputManager). */
export interface FrameInput {
  poll(): InputFrame;
  readonly isGamepadConnected: boolean;
}

/** Everything one frame touches. */
export interface FrameDriverOptions {
  readonly input: FrameInput;
  readonly platform: Platform;
  readonly logger: Logger;
  readonly stack: SceneStack;
  readonly transition: TransitionDriver;
  /** Mirror events since the last frame; the driver drains it into the top scene. */
  readonly a11yQueue: A11yEvent[];
  readonly display: Display;
  readonly palette: PaletteController;
  readonly mirror: Pick<A11yMirror, 'sync' | 'announce'>;
  readonly i18n: () => Translator;
  readonly isReducedMotion: () => boolean;
  readonly onError: (error: unknown) => void;
  /** Called once, after the first presented frame (window reveal, error boundary). */
  readonly onFirstPresent: () => void;
}

/** The mirror tree of the too-small notice: one text node. */
function tooSmallTree(layout: LayoutResult, i18n: Translator): A11yTree {
  return {
    title: i18n.t('arcade.app.title'),
    nodes: [
      {
        kind: 'text',
        id: 'too-small',
        rect: layout.safe,
        label: i18n.t('arcade.tooSmall.message'),
      },
    ],
    focusId: undefined,
  };
}

/** Handles the input shortcuts of a frame (F11 fullscreen where the platform has it). */
function runShortcuts(options: FrameDriverOptions, shortcuts: readonly Shortcut[]): void {
  if (shortcuts.includes('toggle-fullscreen')) {
    settle(options.platform.fullscreen.toggle(), options.logger, 'fullscreen');
  }
}

/** Polls the input, runs shortcuts and the dissolve, and updates the top scene (idle while covered). */
function beginFrame(
  options: FrameDriverOptions,
  frame: { readonly timeMs: number; readonly deltaMs: number },
): void {
  const { stack, transition, display, a11yQueue } = options;
  const input = options.input.poll();
  runShortcuts(options, input.shortcuts);
  const deltaSeconds = frame.deltaMs / 1000;
  transition.advance(deltaSeconds);
  const { layout } = display;
  if (layout.kind !== 'ok') {
    a11yQueue.length = 0;
    return;
  }
  const isCovered = transition.isActive;
  stack.update({
    input: isCovered ? createIdleInputFrame(input.lastDevice) : input,
    layout,
    timeMs: frame.timeMs,
    deltaSeconds,
    isReducedMotion: options.isReducedMotion(),
    a11yEvents: isCovered ? [] : a11yQueue.splice(0),
  });
}

/** Draws the scenes and the dissolve, or the too-small notice; returns the mirror tree. */
function drawFrame(
  options: FrameDriverOptions,
  context: { readonly frame: LoopFrame; readonly wasTooSmall: boolean },
): A11yTree {
  const { stack, transition, display } = options;
  const { layout, target } = display;
  clearFramebuffer(target.framebuffer, SLOT.paper);
  if (layout.kind === 'ok') {
    const { alpha, timeMs } = context.frame;
    stack.render({ target, layout, alpha, timeMs, isReducedMotion: options.isReducedMotion() });
    transition.draw(target);
    return stack.a11y();
  }
  const i18n = options.i18n();
  drawTooSmall(target, layout, i18n);
  if (!context.wasTooSmall) {
    options.mirror.announce(i18n.t('arcade.tooSmall.message'));
  }
  return tooSmallTree(layout, i18n);
}

/** The loop hooks of the app: input poll and scene update, fixed steps, render and present. */
export function createFrameDriver(options: FrameDriverOptions): LoopHooks {
  const { stack, transition, display, a11yQueue } = options;
  let hasPresented = false;
  let wasTooSmall = false;
  return {
    beginFrame: (timeMs, deltaMs) => {
      beginFrame(options, { timeMs, deltaMs });
    },
    step: (dtSeconds) => {
      if (!transition.isActive && display.layout.kind === 'ok') {
        stack.fixedUpdate(dtSeconds);
      }
    },
    render: (frame) => {
      const tree = drawFrame(options, { frame, wasTooSmall });
      wasTooSmall = display.layout.kind !== 'ok';
      display.present(options.palette.lut);
      options.mirror.sync(tree);
      if (!hasPresented) {
        hasPresented = true;
        options.onFirstPresent();
      }
    },
    shouldContinue: () =>
      stack.isAnimating() ||
      options.input.isGamepadConnected ||
      transition.isActive ||
      a11yQueue.length > 0,
    onError: options.onError,
  };
}
