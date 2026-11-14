// @vitest-environment happy-dom
import { A11yMirror } from '@r15k/engine';
import { expect, test } from 'vitest';
import { createHubScene } from '../scenes/hub-scene.ts';
import { createAppHarness } from '../test-support/app-harness.ts';
import type { AppHarness } from '../test-support/app-harness.ts';

test('activating the settings Back mirror node wakes the stopped loop; one frame later the hub is on top', () => {
  const root = document.createElement('div');
  document.body.append(root);
  const holder: { harness?: AppHarness } = {};
  const mirror = new A11yMirror({
    root,
    document,
    toCss: (rect) => rect,
    onEvent: (event) => {
      holder.harness?.a11yQueue.push(event);
      holder.harness?.loop.wake();
    },
  });
  const harness = createAppHarness({ mirror });
  holder.harness = harness;
  harness.stack.push(createHubScene(harness.services));
  harness.navigation.openSettings();
  harness.loop.wake();
  harness.frames(10);
  expect(harness.isRunning).toBe(false);
  expect(harness.stack.top?.id).toBe('settings');
  const back = root.querySelector<HTMLButtonElement>('[data-a11y-id="back"]');
  expect(back).not.toBeNull();
  back?.click();
  expect(harness.isRunning).toBe(true);
  harness.frames(1);
  expect(harness.stack.top?.id).toBe('hub');
  mirror.dispose();
});
