// R15K Arcade – E2E offline: the whole flow makes only same-origin requests, logs no console error and
// runs under the CSP meta tag of the e2e build.
import { FLOW_TIMEOUT_MS, playChain } from './chain.ts';
import { expect, expectedIdleScore, ORIGIN, test } from './fixtures.ts';

// Playwright screenshots (traces, failure shots) inject an inline stylesheet in WebKit, which the CSP
// refuses with a console error; this spec checks only the app's own console output, so it takes none.
test.use({ trace: 'off', screenshot: 'off' });

test('the full flow stays on its own origin without console errors, under the CSP', async ({
  app,
}) => {
  test.setTimeout(FLOW_TIMEOUT_MS);
  await playChain(app, { score: expectedIdleScore(), isRecording: false });
  const csp = app.page.locator('meta[http-equiv="Content-Security-Policy"]');
  await expect(csp).toHaveCount(1);
  expect(await csp.getAttribute('content')).toContain("default-src 'self'");
  expect(app.requests.filter((url) => !url.startsWith(ORIGIN))).toEqual([]);
  expect(app.consoleErrors).toEqual([]);
});
