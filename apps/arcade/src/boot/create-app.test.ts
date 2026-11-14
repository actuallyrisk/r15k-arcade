// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest';
import { createApp } from './create-app.ts';

/** The body of index.html. */
const PAGE = `
  <div id="stage" class="stage"><canvas id="screen" class="screen" aria-hidden="true"></canvas></div>
  <div id="a11y-root" class="a11y-root"></div>
  <div class="safe-probes" aria-hidden="true">
    <div id="safe-top"></div><div id="safe-right"></div><div id="safe-bottom"></div><div id="safe-left"></div>
  </div>
  <div id="fatal" class="fatal" role="alert" hidden></div>`;

/** A 2D context that accepts every call the presenter makes. */
function fakeContext(): object {
  return {
    createImageData: (width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData: vi.fn(),
    drawImage: vi.fn(),
    imageSmoothingEnabled: false,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

/** Waits for the event loop and a few animation frames. */
async function settle(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

test('the app boots: palette, mirror with the boot scene, no failure box, the e2e hook', async () => {
  document.body.innerHTML = PAGE;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => fakeContext() as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(window, 'fetch').mockRejectedValue(new Error('offline test'));
  await createApp({ window, document, isDevBuild: false, isE2eBuild: true, baseUrl: './' });
  await settle(100);
  expect(document.getElementById('fatal')?.hidden).toBe(true);
  expect(document.documentElement.style.getPropertyValue('--r15k-paper')).toMatch(/^#/);
  expect(document.querySelector('#a11y-root main')).not.toBeNull();
  expect(document.querySelector('#a11y-root h1')?.textContent).toBe('R15K ARCADE');
  const hook = (window as unknown as { __r15kE2e?: { unlockCalls: () => number } }).__r15kE2e;
  expect(hook?.unlockCalls()).toBe(0);
  const save = window.localStorage.getItem('r15k-arcade:save');
  expect(save === null || save.includes('"launchCount":1')).toBe(true);
});

test('a page without its elements rejects (main.ts then shows the failure box)', async () => {
  await expect(
    createApp({ window, document, isDevBuild: false, isE2eBuild: false, baseUrl: './' }),
  ).rejects.toThrow('#screen');
});
