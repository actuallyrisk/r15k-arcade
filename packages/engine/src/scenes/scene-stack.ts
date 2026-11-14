import { EMPTY_A11Y_TREE } from '../a11y/a11y-types.ts';
import type { A11yTree } from '../a11y/a11y-types.ts';
import type { SuspendReason } from '../lifecycle/lifecycle-monitor.ts';
import type { Logger } from '../logger/logger.ts';
import type { FrameContext, RenderContext, Scene } from './scene.ts';

/** Construction options of the scene stack. */
export interface SceneStackOptions {
  readonly logger: Logger;
  readonly onSceneError: (error: unknown, scene: Scene) => void;
}

/** A requested change of the stack; applied once no scene method runs. */
type StackOperation =
  | { readonly kind: 'push'; readonly scene: Scene }
  | { readonly kind: 'pop' }
  | { readonly kind: 'replace'; readonly scene: Scene }
  | { readonly kind: 'reset'; readonly scene: Scene };

/** Index of the highest scene that is not an overlay (0 when every scene is one). */
function renderBaseIndex(scenes: readonly Scene[]): number {
  for (let index = scenes.length - 1; index > 0; index -= 1) {
    if (scenes[index]?.isOverlay === false) {
      return index;
    }
  }
  return 0;
}

/**
 * Stack of scenes with push, pop, replace and reset. Operations requested while a scene method runs
 * (including the enter/exit/cover/reveal calls of another operation, and the scene error handler) are
 * queued and applied in order once that call into the stack returns, so a scene never sees the stack
 * change underneath it. Every call into a scene is guarded: a throw is logged and handed to
 * `onSceneError`, and the stack carries on with a neutral result.
 */
export class SceneStack {
  private readonly logger: Logger;
  private readonly onSceneError: (error: unknown, scene: Scene) => void;
  private readonly scenes: Scene[] = [];
  private readonly pending: StackOperation[] = [];
  private activeCalls = 0;
  private isApplying = false;

  constructor(options: SceneStackOptions) {
    this.logger = options.logger;
    this.onSceneError = options.onSceneError;
  }

  /** Pushes a scene; an overlay covers the current top first, then the new scene enters. */
  push(scene: Scene): void {
    this.request({ kind: 'push', scene });
  }

  /** Pops the top scene (it exits); the new top is revealed. */
  pop(): void {
    this.request({ kind: 'pop' });
  }

  /** Replaces the top scene: the old one exits, the new one enters. */
  replace(scene: Scene): void {
    this.request({ kind: 'replace', scene });
  }

  /** Exits every scene (top first) and enters `scene` on the empty stack. */
  reset(scene: Scene): void {
    this.request({ kind: 'reset', scene });
  }

  /** The top scene. */
  get top(): Scene | undefined {
    return this.scenes.at(-1);
  }

  /** Number of scenes on the stack. */
  get depth(): number {
    return this.scenes.length;
  }

  /** Updates the top scene only; it alone receives `frame.a11yEvents`. */
  update(frame: FrameContext): void {
    this.withTop('update', (scene) => {
      scene.update(frame);
    });
  }

  /** Steps the top scene only. */
  fixedUpdate(dtSeconds: number): void {
    this.withTop('fixedUpdate', (scene) => {
      scene.fixedUpdate(dtSeconds);
    });
  }

  /** Renders from the highest non-overlay scene up to the top, bottom first. */
  render(context: RenderContext): void {
    this.run(() => {
      for (const scene of this.renderedScenes()) {
        this.attempt(scene, 'render', (target) => {
          target.render(context);
        });
      }
    });
  }

  /** The top scene's tree; an empty tree when there is no scene or the scene throws. */
  a11y(): A11yTree {
    return this.withTop('a11y', (scene) => scene.a11y()) ?? EMPTY_A11Y_TREE;
  }

  /** Whether any rendered scene animates (a throwing scene counts as not animating). */
  isAnimating(): boolean {
    return this.run(() =>
      this.renderedScenes().some(
        (scene) => this.attempt(scene, 'isAnimating', (target) => target.isAnimating()) === true,
      ),
    );
  }

  /** Suspends the top scene only. */
  suspend(reason: SuspendReason): void {
    this.withTop('suspend', (scene) => {
      scene.suspend(reason);
    });
  }

  /** The scenes `render` draws: from the highest non-overlay scene to the top. */
  private renderedScenes(): readonly Scene[] {
    return this.scenes.slice(renderBaseIndex(this.scenes));
  }

  /** Calls the top scene, if any, inside a guarded stack call. */
  private withTop<T>(method: string, call: (scene: Scene) => T): T | undefined {
    return this.run(() => {
      const top = this.top;
      return top === undefined ? undefined : this.attempt(top, method, call);
    });
  }

  /** Runs a stack method that calls into scenes; requests made meanwhile are applied afterwards. */
  private run<T>(body: () => T): T {
    this.activeCalls += 1;
    try {
      return body();
    } finally {
      this.activeCalls -= 1;
      this.applyPending();
    }
  }

  /** Calls one scene method; a throw is logged and reported, and the result is then undefined. */
  private attempt<T>(scene: Scene, method: string, call: (scene: Scene) => T): T | undefined {
    try {
      return call(scene);
    } catch (error: unknown) {
      this.logger.error(`scene '${scene.id}' failed in ${method}`, error);
      try {
        this.onSceneError(error, scene);
      } catch (handlerError: unknown) {
        this.logger.error(`scene error handler failed for '${scene.id}'`, handlerError);
      }
      return undefined;
    }
  }

  /** Queues an operation and applies it right away unless a scene method is running. */
  private request(operation: StackOperation): void {
    this.pending.push(operation);
    this.applyPending();
  }

  /** Applies queued operations in order, including those their own scene calls request. */
  private applyPending(): void {
    if (this.activeCalls > 0 || this.isApplying) {
      return;
    }
    this.isApplying = true;
    try {
      for (let operation = this.pending.shift(); operation; operation = this.pending.shift()) {
        this.apply(operation);
      }
    } finally {
      this.isApplying = false;
    }
  }

  /** Applies one operation with the lifecycle calls of the spec order. */
  private apply(operation: StackOperation): void {
    switch (operation.kind) {
      case 'push': {
        const below = this.top;
        if (operation.scene.isOverlay && below !== undefined) {
          this.attempt(below, 'cover', (scene) => {
            scene.cover();
          });
        }
        this.enter(operation.scene);
        return;
      }
      case 'pop':
        this.popTop();
        return;
      case 'replace':
        this.exitTop();
        this.enter(operation.scene);
        return;
      case 'reset':
        while (this.scenes.length > 0) {
          this.exitTop();
        }
        this.enter(operation.scene);
        return;
    }
  }

  /** Puts a scene on top and enters it. */
  private enter(scene: Scene): void {
    this.scenes.push(scene);
    this.attempt(scene, 'enter', (target) => {
      target.enter();
    });
  }

  /** Removes the top scene, if any, and exits it. */
  private exitTop(): void {
    const top = this.scenes.pop();
    if (top !== undefined) {
      this.attempt(top, 'exit', (scene) => {
        scene.exit();
      });
    }
  }

  /** Pops the top scene and reveals the one below; popping an empty stack is logged. */
  private popTop(): void {
    if (this.scenes.length === 0) {
      this.logger.warn('pop on an empty scene stack');
      return;
    }
    this.exitTop();
    const top = this.top;
    if (top !== undefined) {
      this.attempt(top, 'reveal', (scene) => {
        scene.reveal();
      });
    }
  }
}
