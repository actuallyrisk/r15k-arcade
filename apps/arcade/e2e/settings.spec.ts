// R15K Arcade – E2E settings: scroll to the last row (wheel with the mouse, a pointer drag on touch
// projects, arrow keys on keyboard projects), switch the intro off, leave by Back, reload.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import type { AppFixture } from './fixtures.ts';
import { keys, mirror, openToHub, run, tapMirror } from './flow.ts';
import { leaveSettings, openSettings } from './settings-flow.ts';

/** The settings rows in display order. */
const ROWS = ['music', 'sfx', 'mute', 'theme', 'language', 'motion', 'intro'] as const;

/** The centre of a mirror element. */
async function centreOf(
  page: Page,
  id: string,
): Promise<{ readonly x: number; readonly y: number }> {
  const box = await mirror(page, id).boundingBox();
  if (box === null) {
    throw new Error(`no box for ${id}`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Scrolls the rows to the end: wheel (mouse projects) or a pointer drag upwards (touch projects). */
async function scrollToEnd(app: AppFixture): Promise<void> {
  const { page } = app;
  const top = await centreOf(page, 'music');
  const bottom = await centreOf(page, 'intro');
  if (app.isTouch) {
    for (let drag = 0; drag < 2; drag += 1) {
      await page.mouse.move(bottom.x, bottom.y);
      await page.mouse.down();
      await page.mouse.move(top.x, top.y, { steps: 12 });
      await page.mouse.up();
      await run(page, 100);
    }
  } else {
    await page.mouse.move(top.x, top.y);
    await page.mouse.wheel(0, 600);
  }
  await run(page, 100);
}

/** Switches the intro from Short to Off (selector "next"). */
async function introOff(app: AppFixture): Promise<void> {
  if (app.isTouch) {
    await tapMirror(app.page, 'intro', { x: 0.35, y: 0.5 });
  } else {
    await keys(app.page, ...ROWS.slice(1).map(() => 'ArrowDown'), 'ArrowRight');
  }
  await expect(mirror(app.page, 'intro')).toHaveAttribute('data-option-id', 'off');
}

test('every row is reachable; the intro switched off stays off after a reload', async ({ app }) => {
  test.setTimeout(120_000);
  const { page } = app;
  await openToHub(app);
  await openSettings(app);
  await scrollToEnd(app);
  const size = page.viewportSize() ?? { width: 0, height: 0 };
  for (const id of ROWS) {
    const box = await mirror(page, id).boundingBox();
    expect(box, id).not.toBeNull();
    expect((box?.y ?? -1) >= 0 && (box?.y ?? 0) + (box?.height ?? 0) <= size.height, id).toBe(true);
  }
  await introOff(app);
  await leaveSettings(app);
  await page.reload();
  await run(page, 500);
  await expect(mirror(page, 'start')).toHaveCount(1);
  await expect(mirror(page, 'game-over')).toHaveCount(0);
  await openSettings(app);
  await expect(mirror(page, 'intro')).toHaveAttribute('data-option-id', 'off');
});
