// R15K Arcade – E2E accessibility: the mirror of every scene of the flow (inside the viewport, off the
// hinge, touch targets ≥ 44 × 44 CSS px), focus following Tab, live announcements, and an assistive
// activation (an untrusted click) reaching the audio unlock path.
import type { Page } from '@playwright/test';
import { topTenToHub } from './chain.ts';
import { expect, test } from './fixtures.ts';
import type { AppFixture } from './fixtures.ts';
import { confirm, enterInitials, mirror, playRoundToGameOver, run } from './flow.ts';
import { expectGoodMirror, expectPauseOnTouchHalf } from './mirror-checks.ts';

/** The round's mirror nodes. */
const PAUSE_ID = 'bug-hunt-pause';
const FIELD_ID = 'bug-hunt-field';

/** Unlock calls counted by the e2e build's hook. */
async function unlockCalls(page: Page): Promise<number> {
  return page.evaluate(() =>
    (window as unknown as { __r15kE2e: { unlockCalls: () => number } }).__r15kE2e.unlockCalls(),
  );
}

/** Waits (running the clock) until the polite live region says `text`. */
async function expectAnnounced(page: Page, text: RegExp): Promise<void> {
  await expect
    .poll(
      async () => {
        await run(page, 50);
        return page.locator('#a11y-root .a11y-live').textContent();
      },
      { timeout: 15_000 },
    )
    .toMatch(text);
}

/** Reaches the hub without any trusted input: the first-launch intro runs to its end. */
async function hubWithoutInput(app: AppFixture): Promise<void> {
  await app.page.goto('/');
  await expect(mirror(app.page, 'game-over')).toHaveCount(1, { timeout: 15_000 });
  await expectGoodMirror(app, 'intro');
  await run(app.page, 10_500);
  await expect(mirror(app.page, 'start')).toHaveCount(1);
  await expectGoodMirror(app, 'hub');
}

/** The round: mirror, pause button placement, safe-area start, countdown announcement. */
async function checkRound(app: AppFixture): Promise<void> {
  // The countdown is announced as "Round starts … 3", then 2, 1 and Go!; any of them proves it.
  await expectAnnounced(app.page, /Round starts|^[123]$|Go!/);
  await expectGoodMirror(app, 'round');
  await expectPauseOnTouchHalf(app, PAUSE_ID);
  if (app.viewport.id === 'phone-portrait') {
    for (const id of [PAUSE_ID, FIELD_ID]) {
      expect((await mirror(app.page, id).boundingBox())?.y ?? 0, id).toBeGreaterThanOrEqual(47);
    }
  }
}

test('the mirror of every scene is usable by assistive technology', async ({ app }) => {
  test.setTimeout(300_000);
  const { page } = app;
  await hubWithoutInput(app);
  expect(await unlockCalls(page)).toBe(0);
  await mirror(page, 'start').dispatchEvent('click');
  expect(await unlockCalls(page)).toBeGreaterThan(0);
  await run(page, 700);
  await checkRound(app);
  await playRoundToGameOver(app, /TIME'S UP!/);
  await expectAnnounced(page, /Time's up!/);
  await expectGoodMirror(app, 'game-over');
  await confirm(app, 'continue');
  await expect(mirror(page, 'ok')).toHaveCount(1);
  await expectGoodMirror(app, 'initials');
  await enterInitials(app);
  await expect(mirror(page, 'hub')).toHaveCount(1);
  await expectGoodMirror(app, 'top10');
  await topTenToHub(app);
  await page.keyboard.press('Tab');
  await run(page, 40);
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-a11y-id'));
  expect(['start', 'settings']).toContain(focused);
});
