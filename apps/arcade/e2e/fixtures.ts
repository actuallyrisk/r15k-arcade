// R15K Arcade – Playwright fixtures and flow helpers shared by the E2E specs. Every spec imports `test`
// from here, so deterministic randomness, the fake clock, request and console checks and the emulated
// safe areas are installed in one place as the specs need them.
import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';
import { REFERENCE_VIEWPORTS } from '@r15k/engine';
import type { ReferenceViewport } from '@r15k/engine';
import { recordBotReplay } from '@r15k/bug-hunt';

/** The round seed every test injects through crypto.getRandomValues (its idle round scores ≥ 1). */
export const ROUND_SEED = 2;
/** The page origin every request must stay on. */
export const ORIGIN = 'http://localhost:4173';

/** What a test knows about its page and project. */
export interface AppFixture {
  readonly page: Page;
  readonly viewport: ReferenceViewport;
  /** Touch projects tap the mirror rects; the others use the keyboard. */
  readonly isTouch: boolean;
  /** Chromium projects with a fold emulate the viewport segments. */
  readonly isSegmentEmulated: boolean;
  readonly projectName: string;
  /** Console errors of the page. */
  readonly consoleErrors: readonly string[];
  /** Every request URL of the page. */
  readonly requests: readonly string[];
}

/** The score of the injected seed when nobody moves the cat (computed with the game's simulation). */
export function expectedIdleScore(): number {
  return recordBotReplay({ seed: ROUND_SEED, note: 'e2e', input: 'idle' }).finalScore;
}

/** Runs before every page script: deterministic seeds and the emulated safe-area probes. */
function initScript(context: { readonly seed: number; readonly insets: readonly number[] }): void {
  const bytes = [0, 8, 16, 24].map((shift) => (context.seed >>> shift) & 255);
  crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
    if (array !== null) {
      const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      view.forEach((_value, index) => {
        view[index] = bytes[index % 4] ?? 0;
      });
    }
    return array;
  };
  // Chromium's deviceScaleFactor emulation reports devicePixelContentBoxSize in CSS px, so the
  // device-pixel box is refused here as WebKit does; the app then uses round(css × dpr) as on Apple.
  window.ResizeObserver = class extends ResizeObserver {
    override observe(target: Element, options?: ResizeObserverOptions): void {
      if (options?.box === 'device-pixel-content-box') {
        throw new TypeError('device-pixel-content-box is not emulated');
      }
      super.observe(target, options);
    }
  };
  document.addEventListener('DOMContentLoaded', () => {
    const [top = 0, right = 0, bottom = 0, left = 0] = context.insets;
    const size = (id: string, property: 'height' | 'width', value: number): void => {
      document.getElementById(id)?.style.setProperty(property, `${value}px`);
    };
    size('safe-top', 'height', top);
    size('safe-right', 'width', right);
    size('safe-bottom', 'height', bottom);
    size('safe-left', 'width', left);
  });
}

/** Emulates the fold of a tabletop project through the DevTools protocol (Chromium only). */
async function emulateFold(page: Page, viewport: ReferenceViewport): Promise<void> {
  const second = viewport.segments[1];
  if (second === undefined) {
    return;
  }
  const session = await page.context().newCDPSession(page);
  const first = viewport.segments[0];
  const offset = first === undefined ? second.y : first.y + first.height;
  // The display feature only takes effect together with the device metrics it belongs to.
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.cssWidth,
    height: viewport.cssHeight,
    deviceScaleFactor: viewport.devicePixelRatio,
    mobile: viewport.isMobile,
    displayFeature: { orientation: 'horizontal', offset, maskLength: 1 },
  });
}

/** The E2E test function of the arcade with the `app` fixture. */
export const test = base.extend<{ app: AppFixture }>({
  app: async ({ page }, use, testInfo) => {
    const viewportId = String(testInfo.project.metadata['viewportId']);
    const viewport = REFERENCE_VIEWPORTS.find((candidate) => candidate.id === viewportId);
    if (viewport === undefined) {
      throw new Error(`unknown viewport ${viewportId}`);
    }
    const { top, right, bottom, left } = viewport.safeArea;
    await page.addInitScript(initScript, { seed: ROUND_SEED, insets: [top, right, bottom, left] });
    await page.clock.install({ time: '2026-11-04T10:00:00' });
    const isSegmentEmulated = testInfo.project.metadata['emulatesSegments'] === true;
    if (isSegmentEmulated) {
      await emulateFold(page, viewport);
    }
    const consoleErrors: string[] = [];
    const requests: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(
          `${message.text()} (${message.location().url}:${String(message.location().lineNumber)})`,
        );
      }
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('request', (request) => requests.push(request.url()));
    const isTouch = testInfo.project.use.hasTouch === true;
    await use({
      page,
      viewport,
      isTouch,
      isSegmentEmulated,
      projectName: testInfo.project.name,
      consoleErrors,
      requests,
    });
  },
});

export { expect } from '@playwright/test';
