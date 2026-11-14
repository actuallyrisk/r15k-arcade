import type { A11yEvent, A11yTree } from '../a11y/a11y-types.ts';
import type { InputFrame } from '../input/input-frame.ts';
import type { Layout } from '../layout/layout-types.ts';
import type { SuspendReason } from '../lifecycle/lifecycle-monitor.ts';
import type { DrawTarget } from '../render/draw-target.ts';

/** What a scene sees once per frame. */
export interface FrameContext {
  readonly input: InputFrame;
  readonly layout: Layout;
  readonly timeMs: number;
  readonly deltaSeconds: number;
  readonly isReducedMotion: boolean;
  /** Mirror events queued since the last frame, top scene only. */
  readonly a11yEvents: readonly A11yEvent[];
}

/** What a scene sees when it renders. */
export interface RenderContext {
  /** Whole logical canvas. */
  readonly target: DrawTarget;
  readonly layout: Layout;
  /** Fixed-step interpolation (previous = the state before the most recent fixed step). */
  readonly alpha: number;
  readonly timeMs: number;
  readonly isReducedMotion: boolean;
}

/** One screen of the app or a game; lives on the scene stack. */
export interface Scene {
  readonly id: string;
  /** True → the scene below is rendered first. */
  readonly isOverlay: boolean;
  enter(): void;
  exit(): void;
  /** An overlay was pushed on top of this scene. */
  cover(): void;
  /** Became top again after an overlay was popped. */
  reveal(): void;
  /** Once per frame (input, a11y events, UI). */
  update(frame: FrameContext): void;
  /** 0…5 times per frame (simulation). */
  fixedUpdate(dtSeconds: number): void;
  render(context: RenderContext): void;
  a11y(): A11yTree;
  /** False → the loop may sleep. */
  isAnimating(): boolean;
  suspend(reason: SuspendReason): void;
}
