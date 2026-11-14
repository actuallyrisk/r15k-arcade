// R15K Arcade – E2E flow steps: drive the app by keyboard on desktop projects and by touch at the CSS
// rects of the accessibility mirror on touch projects. Time runs on Playwright's installed clock.
import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { AppFixture } from './fixtures.ts';

/** One display frame at 60 Hz, plus a little, in clock milliseconds. */
const FRAME_MS = 20;
/** Clock time that covers a dissolve between scenes. */
const DISSOLVE_MS = 700;

/** A mirror element by its node id. */
export function mirror(page: Page, id: string): Locator {
  return page.locator(`#a11y-root [data-a11y-id="${id}"]`);
}

/** Lets the app run for some clock time. */
export async function run(page: Page, ms: number): Promise<void> {
  await page.clock.runFor(ms);
}

/** Taps (touch) the centre of a mirror element, or a point inside it at the given fractions. */
export async function tapMirror(page: Page, id: string, at = { x: 0.5, y: 0.5 }): Promise<void> {
  const box = await mirror(page, id).boundingBox();
  if (box === null) {
    throw new Error(`mirror element ${id} has no box`);
  }
  await page.touchscreen.tap(box.x + box.width * at.x, box.y + box.height * at.y);
  await run(page, 2 * FRAME_MS);
}

/** Presses keys one after another, letting a frame pass after each. */
export async function keys(page: Page, ...names: readonly string[]): Promise<void> {
  for (const name of names) {
    await page.keyboard.press(name);
    await run(page, 2 * FRAME_MS);
  }
}

/** Waits (running the clock) until the mirror title is `title`. */
export async function waitForTitle(page: Page, title: string | RegExp): Promise<void> {
  await expect
    .poll(
      async () => {
        await run(page, 100);
        return page.locator('#a11y-root h1.a11y-title').textContent();
      },
      { timeout: 15_000 },
    )
    .toMatch(title);
}

/** Opens the app and skips the intro (first launch: full intro) to the hub. */
export async function openToHub(app: AppFixture): Promise<void> {
  const { page } = app;
  await page.goto('/');
  await expect(mirror(page, 'game-over')).toHaveCount(1, { timeout: 15_000 });
  if (app.isTouch) {
    await tapMirror(page, 'game-over');
  } else {
    await page.keyboard.press('Enter');
  }
  await run(page, DISSOLVE_MS);
  await expect(mirror(page, 'start')).toHaveCount(1);
}

/** Starts a round from the hub. */
export async function startRound(app: AppFixture): Promise<void> {
  if (app.isTouch) {
    await tapMirror(app.page, 'start');
  } else {
    await keys(app.page, 'Enter');
  }
  await run(app.page, DISSOLVE_MS);
  await expect(mirror(app.page, 'start')).toHaveCount(0);
}

/** Plays the whole round without input until the game-over overlay shows. */
export async function playRoundToGameOver(app: AppFixture, title: RegExp): Promise<void> {
  await run(app.page, 1_900);
  await run(app.page, 61_000);
  await waitForTitle(app.page, title);
}

/** Activates a mirror button: Enter on keyboard projects (it must have the focus), a tap on touch. */
export async function confirm(app: AppFixture, id: string): Promise<void> {
  if (app.isTouch) {
    await tapMirror(app.page, id);
  } else {
    await keys(app.page, 'Enter');
  }
}

/** Taps the upper (−1) or lower (+1) half of an initials box `count` times. */
async function stepLetter(
  page: Page,
  context: { readonly index: number; readonly isUp: boolean; readonly count: number },
): Promise<void> {
  for (let tap = 0; tap < context.count; tap += 1) {
    await tapMirror(page, `initials.${context.index}`, { x: 0.5, y: context.isUp ? 0.2 : 0.8 });
  }
}

/** Enters R15: typed on keyboard projects, box halves on touch projects; then OK. */
export async function enterInitials(app: AppFixture): Promise<void> {
  const { page } = app;
  if (!app.isTouch) {
    await page.keyboard.type('R15');
    await run(page, 2 * FRAME_MS);
    await keys(page, 'Enter');
    return;
  }
  await stepLetter(page, { index: 0, isUp: false, count: 17 });
  await stepLetter(page, { index: 1, isUp: true, count: 9 });
  await stepLetter(page, { index: 2, isUp: true, count: 5 });
  await tapMirror(page, 'ok');
}

/** Saves a screenshot of the current screen for the visual record. */
export async function screenshot(app: AppFixture, name: string): Promise<void> {
  await app.page.screenshot({ path: `../../.tmp/e2e-screens/${app.projectName}-${name}.png` });
}
