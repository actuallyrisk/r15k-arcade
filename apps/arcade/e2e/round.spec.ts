// R15K Arcade – E2E chain: start → round → top-10 entry → settings → reload keeps the data.
import { FLOW_TIMEOUT_MS, playChain } from './chain.ts';
import { expect, expectedIdleScore, test } from './fixtures.ts';
import type { AppFixture } from './fixtures.ts';
import { mirror, run } from './flow.ts';
import { openSettings } from './settings-flow.ts';

/** After the reload: German labels, dark paper, music 30 and the entry in the hub list. */
async function expectPersisted(app: AppFixture, score: number): Promise<void> {
  const { page } = app;
  await page.reload();
  await run(page, 3_000);
  await expect(mirror(page, 'settings')).toHaveText('Einstellungen');
  const paper = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue('--r15k-paper'),
  );
  expect(paper).toBe('#12140f');
  await expect(mirror(page, 'scores')).toContainText(`Platz 1: R15, ${score}`);
  await openSettings(app);
  await expect(mirror(page, 'music')).toHaveValue('30');
}

test('a round ends in the top 10, settings change, and a reload keeps both', async ({ app }) => {
  test.setTimeout(FLOW_TIMEOUT_MS);
  const score = expectedIdleScore();
  expect(score).toBeGreaterThanOrEqual(1);
  await playChain(app, { score, isRecording: true });
  await expectPersisted(app, score);
});
