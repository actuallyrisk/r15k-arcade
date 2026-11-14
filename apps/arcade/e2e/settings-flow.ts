// R15K Arcade – E2E settings steps: open the settings from the hub, change values by keys (keyboard
// projects) or through the mirror controls (touch projects), leave by the title-bar Back.
import { expect } from '@playwright/test';
import type { AppFixture } from './fixtures.ts';
import { keys, mirror, run, tapMirror } from './flow.ts';

/** Clock time that covers a dissolve between scenes. */
const DISSOLVE_MS = 700;

/** Opens the settings from the hub (gear). */
export async function openSettings(app: AppFixture): Promise<void> {
  if (app.isTouch) {
    await tapMirror(app.page, 'settings');
  } else {
    const focused = await app.page.evaluate(() =>
      document.activeElement?.getAttribute('data-a11y-id'),
    );
    await keys(app.page, ...(focused === 'settings' ? [] : ['ArrowDown']), 'Enter');
  }
  await expect(mirror(app.page, 'music')).toHaveCount(1);
}

/** Sets a mirror slider like assistive technology does. */
async function setSlider(app: AppFixture, id: string, value: number): Promise<void> {
  await mirror(app.page, id).evaluate((element, next) => {
    (element as HTMLInputElement).value = String(next);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await run(app.page, 40);
}

/** Most adjustments a selector of the settings needs to reach any option. */
const MAX_SELECTOR_STEPS = 8;

/**
 * Chooses a selector option like assistive technology does: synthetic (untrusted) ArrowUp key
 * events on the mirror spinbutton, one per frame, until it reports the option.
 */
async function choose(app: AppFixture, id: string, optionId: string): Promise<void> {
  const spinbutton = mirror(app.page, id);
  for (let step = 0; step < MAX_SELECTOR_STEPS; step += 1) {
    if ((await spinbutton.getAttribute('data-option-id')) === optionId) {
      return;
    }
    await spinbutton.dispatchEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
    await run(app.page, 40);
  }
  await expect(spinbutton).toHaveAttribute('data-option-id', optionId);
}

/** Language Deutsch, theme dark, music 30, reduced motion on; then back to the hub. */
export async function changeSettings(app: AppFixture): Promise<void> {
  if (app.isTouch) {
    await setSlider(app, 'music', 30);
    await choose(app, 'theme', 'dark');
    await choose(app, 'language', 'de');
    await choose(app, 'motion', 'on');
    await tapMirror(app.page, 'back');
  } else {
    await keys(app.page, 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft');
    await keys(app.page, 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowRight', 'ArrowRight');
    await keys(app.page, 'ArrowDown', 'ArrowRight', 'ArrowDown', 'ArrowRight', 'Escape');
  }
  await run(app.page, DISSOLVE_MS);
  await expect(mirror(app.page, 'start')).toHaveCount(1);
}

/** Leaves the settings by the Back button of the title bar. */
export async function leaveSettings(app: AppFixture): Promise<void> {
  if (app.isTouch) {
    await tapMirror(app.page, 'back');
  } else {
    await keys(app.page, 'Escape');
  }
  await expect(mirror(app.page, 'start')).toHaveCount(1);
}
