import { expect, test, vi } from 'vitest';
import { EMPTY_A11Y_TREE } from '../a11y/a11y-types.ts';
import type { DrawTarget } from '../render/draw-target.ts';
import type { Scene } from './scene.ts';
import { SceneStack } from './scene-stack.ts';
import { renderContext, testTarget } from './test-support/frame-literals.ts';
import { createTestLogger } from './test-support/test-logger.ts';
import { createTestScene } from './test-support/test-scene.ts';

/**
 * A dot that moves one pixel per fixed step and follows the interpolation rule: `previous` is the
 * position before the most recent step, and while covered (no steps) previous equals current.
 */
function createMovingDot(): Scene {
  let previous = 0;
  let current = 0;
  let isCovered = false;
  const hold = (): void => {
    previous = current;
  };
  return {
    id: 'dot',
    isOverlay: false,
    enter: hold,
    exit: hold,
    cover: () => {
      isCovered = true;
      hold();
    },
    reveal: () => {
      isCovered = false;
    },
    update: hold,
    fixedUpdate: () => {
      previous = current;
      current += 1;
    },
    render: ({ target, alpha }) => {
      const x = Math.round(previous + (current - previous) * alpha);
      target.framebuffer.pixels[x] = 1;
    },
    a11y: () => EMPTY_A11Y_TREE,
    isAnimating: () => !isCovered,
    suspend: hold,
  };
}

/** Renders the stack at `alpha` into a fresh 8×1 framebuffer. */
function renderAt(stack: SceneStack, alpha: number): DrawTarget {
  const target = testTarget(8, 1);
  stack.render(renderContext(target, alpha));
  return target;
}

/** A stack holding the dot after two fixed steps. */
function stackWithMovedDot(): SceneStack {
  const stack = new SceneStack({ logger: createTestLogger().logger, onSceneError: vi.fn() });
  stack.push(createMovingDot());
  stack.fixedUpdate(1 / 120);
  stack.fixedUpdate(1 / 120);
  return stack;
}

test('while stepping, different alpha values render different frames', () => {
  const stack = stackWithMovedDot();
  expect(renderAt(stack, 0.2).framebuffer.pixels).not.toEqual(
    renderAt(stack, 0.8).framebuffer.pixels,
  );
  expect(stack.isAnimating()).toBe(true);
});

test('while covered by an overlay, two renders with different alpha are identical', () => {
  const stack = stackWithMovedDot();
  stack.push(createTestScene('pause', { log: [], isOverlay: true }));
  stack.fixedUpdate(1 / 120);
  const early = renderAt(stack, 0.1);
  const late = renderAt(stack, 0.9);
  expect(early.framebuffer.pixels).toEqual(late.framebuffer.pixels);
  expect(Array.from(early.framebuffer.pixels)).toEqual([0, 0, 1, 0, 0, 0, 0, 0]);
  expect(stack.isAnimating()).toBe(false);
});
