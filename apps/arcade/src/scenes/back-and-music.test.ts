import type { RoundResult } from '@r15k/engine';
import { expect, test, vi } from 'vitest';
import { createAppHarness } from '../test-support/app-harness.ts';
import type { AppHarness } from '../test-support/app-harness.ts';
import { createHubScene } from './hub-scene.ts';

/** Frames that cover a whole dissolve and a little more. */
const DISSOLVE_FRAMES = 40;
/** The Android platform of the back-button tests. */
const ANDROID = { os: 'android', capabilities: ['backButton', 'immersive', 'keepAwake'] } as const;

/** A finished round with a qualifying score. */
const RESULT: RoundResult = {
  gameId: 'bug-hunt',
  mode: 'arcade',
  seed: 1,
  score: 7,
  stats: {
    bugsCaught: 7,
    goldenCaught: 0,
    bombsCaught: 0,
    misses: 0,
    bombsDodged: 0,
    bestStreak: 0,
    durationSeconds: 60,
  },
};

/** An Android harness with the hub on top. */
function androidHub(): AppHarness {
  const harness = createAppHarness(ANDROID);
  harness.stack.push(createHubScene(harness.services));
  harness.loop.wake();
  harness.frames(1);
  return harness;
}

/** Presses the Android back button and runs a few frames. */
function pressBack(harness: AppHarness, frames = 2): void {
  harness.platform.pressBack();
  harness.frames(frames);
}

test('Android back at the hub moves the app to the background', () => {
  const harness = androidHub();
  pressBack(harness);
  expect(harness.platform.calls.at(-1)).toEqual({
    capability: 'backButton.moveToBackground',
    argument: undefined,
  });
  expect(harness.stack.top?.id).toBe('hub');
});

test('back at the hub does nothing without a back button', () => {
  const harness = createAppHarness();
  harness.stack.push(createHubScene(harness.services));
  harness.loop.wake();
  harness.press('back');
  harness.frames(2);
  expect(harness.platform.calls).toEqual([]);
  expect(harness.stack.top?.id).toBe('hub');
});

test('Android back goes one screen back from settings, pause and the top 10', () => {
  const harness = androidHub();
  harness.navigation.openSettings();
  pressBack(harness);
  expect(harness.stack.top?.id).toBe('hub');
  harness.navigation.startRound();
  harness.frames(DISSOLVE_FRAMES);
  harness.navigation.pauseRound('player');
  pressBack(harness);
  expect(harness.stack.top?.id).toBe('bug-hunt-round');
  harness.navigation.finishRound({ ...RESULT, score: 0 });
  harness.navigation.continueAfterGameOver({ ...RESULT, score: 0 });
  expect(harness.stack.top?.id).toBe('top10');
  pressBack(harness, DISSOLVE_FRAMES);
  expect(harness.stack.top?.id).toBe('hub');
  expect(harness.errors).toEqual([]);
});

test('Android back on the initials leaves to the top 10 without saving', () => {
  const harness = androidHub();
  harness.navigation.continueAfterGameOver(RESULT);
  expect(harness.stack.top?.id).toBe('initials');
  pressBack(harness);
  expect(harness.stack.top?.id).toBe('top10');
  expect(harness.services.save.get().scores.bugHunt.arcade).toEqual([]);
});

test('the hub plays Meow House on enter and reveal; a round fades it out; no other scene plays music', () => {
  const harness = createAppHarness();
  const playMusic = vi.spyOn(harness.mixer, 'playMusic');
  const stopMusic = vi.spyOn(harness.mixer, 'stopMusic');
  harness.stack.push(createHubScene(harness.services));
  harness.loop.wake();
  expect(playMusic.mock.calls).toEqual([['meow-house']]);
  harness.navigation.openSettings();
  harness.navigation.back();
  expect(playMusic.mock.calls).toEqual([['meow-house'], ['meow-house']]);
  harness.navigation.startRound();
  expect(stopMusic.mock.calls).toEqual([[{ fadeOutSeconds: 0.4 }]]);
  harness.frames(DISSOLVE_FRAMES);
  harness.navigation.pauseRound('player');
  harness.navigation.finishRound(RESULT);
  harness.navigation.continueAfterGameOver(RESULT);
  harness.navigation.back();
  expect(playMusic).toHaveBeenCalledTimes(2);
  harness.navigation.toHub();
  harness.frames(DISSOLVE_FRAMES);
  expect(playMusic).toHaveBeenCalledTimes(3);
});
