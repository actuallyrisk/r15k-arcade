// R15K Arcade – Playwright E2E: every reference viewport in Chromium and WebKit against the production
// build in mode "e2e" (which adds the CSP meta tag). Time is driven by page.clock. WebKit cannot emulate
// viewport segments, so its two fold-tabletop projects run the flat posture at the same sizes.
import { defineConfig, devices } from '@playwright/test';
import { REFERENCE_VIEWPORTS } from '@r15k/engine';

const isCi = process.env['CI'] === 'true';
const BROWSERS = ['chromium', 'webkit'] as const;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  ...(isCi ? { workers: 2 } : {}),
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../../.tmp/playwright-report' }]],
  outputDir: '../../.tmp/playwright-results',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !isCi,
    timeout: 60_000,
  },
  projects: REFERENCE_VIEWPORTS.flatMap((viewport) =>
    BROWSERS.map((browser) => ({
      name: `${browser}-${viewport.id}`,
      use: {
        ...devices[browser === 'chromium' ? 'Desktop Chrome' : 'Desktop Safari'],
        viewport: { width: viewport.cssWidth, height: viewport.cssHeight },
        deviceScaleFactor: viewport.devicePixelRatio,
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
      },
      metadata: {
        viewportId: viewport.id,
        emulatesSegments: browser === 'chromium' && viewport.segments.length > 0,
      },
    })),
  ),
});
