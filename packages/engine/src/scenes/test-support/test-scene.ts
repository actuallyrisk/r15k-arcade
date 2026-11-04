// A scene double that writes every call into a shared log (`<id>.<method>`) and can be told to throw.
import { EMPTY_A11Y_TREE } from '../../a11y/a11y-types.ts';
import type { A11yTree } from '../../a11y/a11y-types.ts';
import type { FrameContext, RenderContext, Scene } from '../scene.ts';

/** Methods of the scene contract. */
export type SceneMethod = Exclude<keyof Scene, 'id' | 'isOverlay'>;

/** Every scene method once. */
export const SCENE_METHODS: readonly SceneMethod[] = [
  'enter',
  'exit',
  'cover',
  'reveal',
  'update',
  'fixedUpdate',
  'render',
  'a11y',
  'isAnimating',
  'suspend',
];

/** Behaviour of a test scene. */
export interface TestSceneOptions {
  /** Shared call log of all scenes of a test. */
  readonly log: string[];
  readonly isOverlay?: boolean;
  readonly tree?: A11yTree;
  readonly isAnimating?: boolean;
  /** Methods that throw `Error('<id>.<method> failed')` after logging the call. */
  readonly failIn?: readonly SceneMethod[];
  readonly onEnter?: () => void;
  readonly onUpdate?: (frame: FrameContext) => void;
  readonly onRender?: (context: RenderContext) => void;
}

/** Logs one call and throws when the method is listed in `failIn`. */
function recorder(
  id: string,
  options: TestSceneOptions,
): (method: SceneMethod, detail?: string) => void {
  return (method, detail = '') => {
    options.log.push(`${id}.${method}${detail}`);
    if (options.failIn?.includes(method) === true) {
      throw new Error(`${id}.${method} failed`);
    }
  };
}

/** Creates a logging scene. */
export function createTestScene(id: string, options: TestSceneOptions): Scene {
  const call = recorder(id, options);
  const plain = (method: SceneMethod) => (): void => {
    call(method);
  };
  return {
    id,
    isOverlay: options.isOverlay ?? false,
    enter: () => {
      call('enter');
      options.onEnter?.();
    },
    exit: plain('exit'),
    cover: plain('cover'),
    reveal: plain('reveal'),
    update: (frame) => {
      call('update');
      options.onUpdate?.(frame);
    },
    fixedUpdate: (dtSeconds) => {
      call('fixedUpdate', `(${dtSeconds})`);
    },
    render: (context) => {
      call('render');
      options.onRender?.(context);
    },
    a11y: () => {
      call('a11y');
      return options.tree ?? EMPTY_A11Y_TREE;
    },
    isAnimating: () => {
      call('isAnimating');
      return options.isAnimating ?? false;
    },
    suspend: (reason) => {
      call('suspend', `(${reason})`);
    },
  };
}
