import type { A11yTree } from '../a11y/a11y-types.ts';
import type { SuspendReason } from '../lifecycle/lifecycle-monitor.ts';
import type { Logger } from '../logger/logger.ts';
import { notImplemented } from '../util/assert.ts';
import type { FrameContext, RenderContext, Scene } from './scene.ts';

/** Construction options of the scene stack. */
export interface SceneStackOptions {
  readonly logger: Logger;
  readonly onSceneError: (error: unknown, scene: Scene) => void;
}

/**
 * Stack of scenes with push, pop, replace and reset. Operations requested while a scene method runs are
 * applied after it returns; every call into a scene is guarded.
 */
export class SceneStack {
  constructor(_options: SceneStackOptions) {
    return notImplemented('engine.SceneStack.constructor');
  }

  /** Pushes a scene (an overlay covers the current top). */
  push(_scene: Scene): void {
    return notImplemented('engine.SceneStack.push');
  }

  /** Pops the top scene; the new top is revealed. */
  pop(): void {
    return notImplemented('engine.SceneStack.pop');
  }

  /** Replaces the top scene. */
  replace(_scene: Scene): void {
    return notImplemented('engine.SceneStack.replace');
  }

  /** Exits every scene (top first) and enters `scene`. */
  reset(_scene: Scene): void {
    return notImplemented('engine.SceneStack.reset');
  }

  /** The top scene. */
  get top(): Scene | undefined {
    return notImplemented('engine.SceneStack.top');
  }

  /** Number of scenes on the stack. */
  get depth(): number {
    return notImplemented('engine.SceneStack.depth');
  }

  /** Updates the top scene only. */
  update(_frame: FrameContext): void {
    return notImplemented('engine.SceneStack.update');
  }

  /** Steps the top scene only. */
  fixedUpdate(_dtSeconds: number): void {
    return notImplemented('engine.SceneStack.fixedUpdate');
  }

  /** Renders from the highest non-overlay scene up to the top. */
  render(_context: RenderContext): void {
    return notImplemented('engine.SceneStack.render');
  }

  /** The top scene's tree; an empty tree when there is no scene. */
  a11y(): A11yTree {
    return notImplemented('engine.SceneStack.a11y');
  }

  /** Whether any rendered scene animates. */
  isAnimating(): boolean {
    return notImplemented('engine.SceneStack.isAnimating');
  }

  /** Suspends the top scene only. */
  suspend(_reason: SuspendReason): void {
    return notImplemented('engine.SceneStack.suspend');
  }
}
