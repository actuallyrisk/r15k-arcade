// R15K Arcade – the E2E chain shared by the round and offline specs: hub → round → game over → initials
// → top 10 → hub → settings changed → hub.
import { expect } from '@playwright/test';
import type { AppFixture } from './fixtures.ts';
import {
  confirm,
  enterInitials,
  keys,
  mirror,
  openToHub,
  playRoundToGameOver,
  run,
  screenshot,
  startRound,
  tapMirror,
} from './flow.ts';
import { changeSettings, openSettings } from './settings-flow.ts';

/** A whole round runs on the page clock; slow machines need minutes. */
export const FLOW_TIMEOUT_MS = 300_000;

/** From the top 10 back to the hub ("To hub"). */
export async function topTenToHub(app: AppFixture): Promise<void> {
  if (app.isTouch) {
    await tapMirror(app.page, 'hub');
  } else {
    await keys(app.page, 'ArrowRight', 'Enter');
  }
  await run(app.page, 700);
  await expect(mirror(app.page, 'start')).toHaveCount(1);
}

/** Plays the chain up to the changed settings, optionally taking the four screenshots of the visual record. */
export async function playChain(
  app: AppFixture,
  options: { readonly score: number; readonly isRecording: boolean },
): Promise<void> {
  const { score } = options;
  const record = async (name: string): Promise<void> => {
    if (options.isRecording) {
      await screenshot(app, name);
    }
  };
  await openToHub(app);
  await record('hub');
  await startRound(app);
  await run(app.page, 5_000);
  await record('round');
  await playRoundToGameOver(app, /TIME'S UP!/);
  await expect(mirror(app.page, 'score')).toContainText(`${score} POINT`);
  await confirm(app, 'continue');
  await expect(mirror(app.page, 'ok')).toHaveCount(1);
  await enterInitials(app);
  await expect(mirror(app.page, 'scores')).toContainText(`Rank 1: R15, ${score}`);
  await record('top10');
  await topTenToHub(app);
  await openSettings(app);
  await changeSettings(app);
  await openSettings(app);
  await record('settings');
}
