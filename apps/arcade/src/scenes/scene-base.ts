import type { A11yTree, FrameContext, RenderContext, Scene, SuspendReason } from '@r15k/engine';

/** The parts of a scene; omitted lifecycle hooks do nothing. */
export interface SceneParts {
  readonly id: string;
  readonly isOverlay?: boolean;
  readonly enter?: () => void;
  readonly exit?: () => void;
  readonly cover?: () => void;
  readonly reveal?: () => void;
  readonly update: (frame: FrameContext) => void;
  readonly fixedUpdate?: (dtSeconds: number) => void;
  readonly render: (context: RenderContext) => void;
  readonly a11y: () => A11yTree;
  readonly isAnimating?: () => boolean;
  readonly suspend?: (reason: SuspendReason) => void;
}

/** Does nothing (an omitted scene hook). */
const NOTHING = (): void => {
  // Intentionally empty: the scene has nothing to do at this point of its lifecycle.
};

/** A scene from its parts; app scenes never step a simulation, so `fixedUpdate` defaults to nothing. */
export function defineScene(parts: SceneParts): Scene {
  return {
    id: parts.id,
    isOverlay: parts.isOverlay ?? false,
    enter: parts.enter ?? NOTHING,
    exit: parts.exit ?? NOTHING,
    cover: parts.cover ?? NOTHING,
    reveal: parts.reveal ?? NOTHING,
    update: parts.update,
    fixedUpdate: parts.fixedUpdate ?? NOTHING,
    render: parts.render,
    a11y: parts.a11y,
    isAnimating: parts.isAnimating ?? (() => false),
    suspend: parts.suspend ?? NOTHING,
  };
}
