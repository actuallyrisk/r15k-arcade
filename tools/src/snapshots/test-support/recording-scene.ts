// R15K Arcade tools – a scene for the harness test that records every call it receives and, when it
// renders, whether the framebuffer was cleared to paper and one ink pixel it draws at the origin.
import { EMPTY_A11Y_TREE, setPixel, SLOT } from '@r15k/engine';
import type { A11yTree, FrameContext, RenderContext, Scene } from '@r15k/engine';

/** One recorded call. */
export type SceneCall =
  | { readonly name: 'enter' }
  | { readonly name: 'update'; readonly frame: FrameContext }
  | { readonly name: 'fixedUpdate'; readonly dtSeconds: number }
  | { readonly name: 'render'; readonly context: RenderContext; readonly isPaperOnly: boolean };

/** A scene and the calls it has received. */
export interface RecordingScene {
  readonly scene: Scene;
  readonly calls: readonly SceneCall[];
}

/** Creates a recording scene. */
export function createRecordingScene(): RecordingScene {
  const calls: SceneCall[] = [];
  const ignore = (): void => undefined;
  const scene: Scene = {
    id: 'recording',
    isOverlay: false,
    enter: () => calls.push({ name: 'enter' }),
    exit: ignore,
    cover: ignore,
    reveal: ignore,
    update: (frame) => calls.push({ name: 'update', frame }),
    fixedUpdate: (dtSeconds) => calls.push({ name: 'fixedUpdate', dtSeconds }),
    render: (context) => {
      const isPaperOnly = context.target.framebuffer.pixels.every((slot) => slot === SLOT.paper);
      calls.push({ name: 'render', context, isPaperOnly });
      setPixel(context.target, { x: 0, y: 0 }, SLOT.ink);
    },
    a11y: (): A11yTree => EMPTY_A11Y_TREE,
    isAnimating: () => false,
    suspend: ignore,
  };
  return { scene, calls };
}
