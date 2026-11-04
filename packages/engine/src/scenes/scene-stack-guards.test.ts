import { expect, test, vi } from 'vitest';
import { EMPTY_A11Y_TREE } from '../a11y/a11y-types.ts';
import type { A11yEvent } from '../a11y/a11y-types.ts';
import type { Scene } from './scene.ts';
import { SceneStack } from './scene-stack.ts';
import { frameContext, renderContext, testTarget } from './test-support/frame-literals.ts';
import { createTestLogger } from './test-support/test-logger.ts';
import { createTestScene, SCENE_METHODS } from './test-support/test-scene.ts';
import type { SceneMethod } from './test-support/test-scene.ts';

const EVENTS: readonly A11yEvent[] = [
  { kind: 'focus', id: 'back' },
  { kind: 'activate', id: 'back' },
];

test('an operation requested during update is applied after update returns', () => {
  const log: string[] = [];
  const stack = new SceneStack({ logger: createTestLogger().logger, onSceneError: vi.fn() });
  const settings = createTestScene('settings', {
    log,
    onUpdate: () => {
      stack.replace(createTestScene('hub', { log }));
      log.push(`top during update: ${stack.top?.id ?? 'none'}`);
    },
  });
  stack.push(settings);
  log.length = 0;
  stack.update(frameContext());
  expect(log).toEqual([
    'settings.update',
    'top during update: settings',
    'settings.exit',
    'hub.enter',
  ]);
  expect(stack.top?.id).toBe('hub');
});

test('mirror events reach the top scene only, and what it requests then is applied afterwards', () => {
  const log: string[] = [];
  const stack = new SceneStack({ logger: createTestLogger().logger, onSceneError: vi.fn() });
  const received: (readonly A11yEvent[])[] = [];
  const base = createTestScene('round', {
    log,
    onUpdate: (frame) => received.push(frame.a11yEvents),
  });
  const pause = createTestScene('pause', {
    log,
    isOverlay: true,
    onUpdate: (frame) => {
      received.push(frame.a11yEvents);
      if (frame.a11yEvents.some((event) => event.kind === 'activate')) {
        stack.pop();
      }
      log.push(`depth during update: ${stack.depth}`);
    },
  });
  stack.push(base);
  stack.push(pause);
  log.length = 0;
  stack.update(frameContext({ a11yEvents: EVENTS }));
  expect(received).toEqual([EVENTS]);
  expect(log).toEqual(['pause.update', 'depth during update: 2', 'pause.exit', 'round.reveal']);
});

test('operations requested by enter and exit run in request order after the current one', () => {
  const log: string[] = [];
  const stack = new SceneStack({ logger: createTestLogger().logger, onSceneError: vi.fn() });
  const boot = createTestScene('boot', {
    log,
    onEnter: () => {
      stack.replace(createTestScene('intro', { log }));
      stack.push(createTestScene('toast', { log, isOverlay: true }));
    },
  });
  stack.push(boot);
  expect(log).toEqual(['boot.enter', 'boot.exit', 'intro.enter', 'intro.cover', 'toast.enter']);
  expect(stack.depth).toBe(2);
});

/** Calls `method` of the stack's top scene through the matching stack call. */
function callThroughStack(stack: SceneStack, method: SceneMethod, failing: Scene): void {
  const calls: Readonly<Record<SceneMethod, () => void>> = {
    enter: () => {
      stack.push(failing);
    },
    exit: () => {
      stack.pop();
    },
    cover: () => {
      stack.push(createTestScene('overlay', { log: [], isOverlay: true }));
    },
    reveal: () => {
      stack.push(createTestScene('overlay', { log: [], isOverlay: true }));
      stack.pop();
    },
    update: () => {
      stack.update(frameContext());
    },
    fixedUpdate: () => {
      stack.fixedUpdate(1 / 120);
    },
    render: () => {
      stack.render(renderContext(testTarget(1, 1), 0));
    },
    a11y: () => {
      expect(stack.a11y()).toBe(EMPTY_A11Y_TREE);
    },
    isAnimating: () => {
      expect(stack.isAnimating()).toBe(false);
    },
    suspend: () => {
      stack.suspend('hidden');
    },
  };
  calls[method]();
}

test.each(SCENE_METHODS)('a throw in %s is logged and reported with the scene', (method) => {
  const { logger, entries } = createTestLogger();
  const onSceneError = vi.fn();
  const stack = new SceneStack({ logger, onSceneError });
  const failing = createTestScene('broken', { log: [], failIn: [method], isAnimating: true });
  if (method !== 'enter') {
    stack.push(failing);
  }
  callThroughStack(stack, method, failing);
  expect(onSceneError).toHaveBeenCalledTimes(1);
  expect(onSceneError).toHaveBeenCalledWith(new Error(`broken.${method} failed`), failing);
  expect(entries).toEqual([
    {
      level: 'error',
      scope: 'test',
      message: `scene 'broken' failed in ${method}`,
      data: new Error(`broken.${method} failed`),
    },
  ]);
});

test('a failing scene does not stop the scenes above it from rendering', () => {
  const log: string[] = [];
  const stack = new SceneStack({ logger: createTestLogger().logger, onSceneError: vi.fn() });
  stack.push(createTestScene('round', { log, failIn: ['render'] }));
  stack.push(createTestScene('pause', { log, isOverlay: true }));
  log.length = 0;
  stack.render(renderContext(testTarget(1, 1), 0));
  expect(log).toEqual(['round.render', 'pause.render']);
});

test('the error handler may reset the stack; the reset is applied after the failing call', () => {
  const log: string[] = [];
  const safe = createTestScene('safe', { log });
  const stack: SceneStack = new SceneStack({
    logger: createTestLogger().logger,
    onSceneError: () => {
      log.push(`handler sees depth ${stack.depth}`);
      stack.reset(safe);
    },
  });
  stack.push(createTestScene('round', { log, failIn: ['update'] }));
  log.length = 0;
  stack.update(frameContext());
  expect(log).toEqual(['round.update', 'handler sees depth 1', 'round.exit', 'safe.enter']);
});

test('a throwing error handler is logged as well', () => {
  const { logger, entries } = createTestLogger();
  const stack = new SceneStack({
    logger,
    onSceneError: () => {
      throw new Error('handler broke');
    },
  });
  stack.push(createTestScene('round', { log: [], failIn: ['update'] }));
  stack.update(frameContext());
  expect(entries.map((entry) => entry.message)).toEqual([
    "scene 'round' failed in update",
    "scene error handler failed for 'round'",
  ]);
  expect(entries[1]?.data).toEqual(new Error('handler broke'));
});
