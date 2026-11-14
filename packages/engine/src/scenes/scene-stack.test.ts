import { expect, test, vi } from 'vitest';
import { EMPTY_A11Y_TREE } from '../a11y/a11y-types.ts';
import type { A11yTree } from '../a11y/a11y-types.ts';
import type { LogEntry } from '../logger/logger.ts';
import type { Scene } from './scene.ts';
import { SceneStack } from './scene-stack.ts';
import { frameContext, renderContext, testTarget } from './test-support/frame-literals.ts';
import { createTestLogger } from './test-support/test-logger.ts';
import { createTestScene } from './test-support/test-scene.ts';
import type { TestSceneOptions } from './test-support/test-scene.ts';

/** A stack, the shared call log, the log entries and a scene factory writing into the call log. */
interface Fixture {
  readonly stack: SceneStack;
  readonly log: string[];
  readonly entries: readonly LogEntry[];
  readonly scene: (id: string, options?: Omit<TestSceneOptions, 'log'>) => Scene;
}

/** Creates the fixture of one test. */
function setup(): Fixture {
  const { logger, entries } = createTestLogger();
  const log: string[] = [];
  const stack = new SceneStack({ logger, onSceneError: vi.fn() });
  return {
    stack,
    log,
    entries,
    scene: (id, options = {}) => createTestScene(id, { log, ...options }),
  };
}

test('push enters the scene; an overlay covers the top first, a full scene does not', () => {
  const { stack, log, scene } = setup();
  const hub = scene('hub');
  stack.push(hub);
  stack.push(scene('pause', { isOverlay: true }));
  stack.push(scene('settings'));
  expect(log).toEqual(['hub.enter', 'hub.cover', 'pause.enter', 'settings.enter']);
  expect(stack.depth).toBe(3);
  expect(stack.top?.id).toBe('settings');
});

test('pop exits the top and reveals the new top', () => {
  const { stack, log, scene } = setup();
  stack.push(scene('round'));
  stack.push(scene('pause', { isOverlay: true }));
  log.length = 0;
  stack.pop();
  expect(log).toEqual(['pause.exit', 'round.reveal']);
  stack.pop();
  expect(log).toEqual(['pause.exit', 'round.reveal', 'round.exit']);
  expect(stack.top).toBeUndefined();
  expect(stack.depth).toBe(0);
});

test('pop on an empty stack changes nothing and logs a warning', () => {
  const { stack, entries } = setup();
  stack.pop();
  expect(stack.depth).toBe(0);
  expect(entries).toEqual([
    { level: 'warn', scope: 'test', message: 'pop on an empty scene stack', data: undefined },
  ]);
});

test('replace exits the top and enters the new scene; on an empty stack it only enters', () => {
  const { stack, log, scene } = setup();
  stack.replace(scene('intro'));
  stack.replace(scene('hub'));
  expect(log).toEqual(['intro.enter', 'intro.exit', 'hub.enter']);
  expect(stack.depth).toBe(1);
  expect(stack.top?.id).toBe('hub');
});

test('reset exits every scene from the top down and enters the new scene', () => {
  const { stack, log, scene } = setup();
  stack.push(scene('hub'));
  stack.push(scene('round'));
  stack.push(scene('pause', { isOverlay: true }));
  log.length = 0;
  stack.reset(scene('hub-2'));
  expect(log).toEqual(['pause.exit', 'round.exit', 'hub.exit', 'hub-2.enter']);
  expect(stack.depth).toBe(1);
});

test('update, fixedUpdate and suspend reach the top scene only', () => {
  const { stack, log, scene } = setup();
  stack.push(scene('round'));
  stack.push(scene('pause', { isOverlay: true }));
  log.length = 0;
  stack.update(frameContext());
  stack.fixedUpdate(0.5);
  stack.suspend('blur');
  expect(log).toEqual(['pause.update', 'pause.fixedUpdate(0.5)', 'pause.suspend(blur)']);
});

test('calls on an empty stack do nothing', () => {
  const { stack } = setup();
  stack.update(frameContext());
  stack.fixedUpdate(0.5);
  stack.suspend('hidden');
  stack.render(renderContext(testTarget(1, 1), 0));
  expect(stack.a11y()).toBe(EMPTY_A11Y_TREE);
  expect(stack.isAnimating()).toBe(false);
});

test('render draws from the highest non-overlay scene up to the top, bottom first', () => {
  const { stack, log, scene } = setup();
  stack.push(scene('hub'));
  stack.push(scene('round'));
  stack.push(scene('pause', { isOverlay: true }));
  stack.push(scene('confirm', { isOverlay: true }));
  log.length = 0;
  stack.render(renderContext(testTarget(1, 1), 0));
  expect(log).toEqual(['round.render', 'pause.render', 'confirm.render']);
});

test('a stack of overlays only renders every scene', () => {
  const { stack, log, scene } = setup();
  stack.push(scene('a', { isOverlay: true }));
  stack.push(scene('b', { isOverlay: true }));
  log.length = 0;
  stack.render(renderContext(testTarget(1, 1), 0));
  expect(log).toEqual(['a.render', 'b.render']);
});

test('a11y returns the tree of the top scene', () => {
  const { stack, scene } = setup();
  const tree: A11yTree = { title: 'Pause', nodes: [], focusId: undefined };
  stack.push(scene('round', { tree: { title: 'Round', nodes: [], focusId: undefined } }));
  stack.push(scene('pause', { isOverlay: true, tree }));
  expect(stack.a11y()).toBe(tree);
});

test('isAnimating asks the rendered scenes only', () => {
  const { stack, log, scene } = setup();
  stack.push(scene('hub', { isAnimating: true }));
  stack.push(scene('settings'));
  stack.push(scene('dialog', { isOverlay: true }));
  log.length = 0;
  expect(stack.isAnimating()).toBe(false);
  expect(log).toEqual(['settings.isAnimating', 'dialog.isAnimating']);
  stack.pop();
  stack.push(scene('busy', { isOverlay: true, isAnimating: true }));
  expect(stack.isAnimating()).toBe(true);
});
