import type { RoundResult } from '@r15k/engine';
import { afterEach, expect, test, vi } from 'vitest';
import { createDefaultSave } from '../save/save-defaults.ts';
import { createAppHarness } from '../test-support/app-harness.ts';
import type { AppHarness, HarnessOptions } from '../test-support/app-harness.ts';
import { createHubScene } from './hub-scene.ts';

/** Frames that cover a whole dissolve (0.5 s at 60 Hz) and a little more. */
const DISSOLVE_FRAMES = 40;

/** A finished round with a score. */
const result = (score: number): RoundResult => ({
  gameId: 'bug-hunt',
  mode: 'arcade',
  seed: 1,
  score,
  stats: {
    bugsCaught: score,
    goldenCaught: 0,
    bombsCaught: 0,
    misses: 0,
    bombsDodged: 0,
    bestStreak: 0,
    durationSeconds: 60,
  },
});

/** A harness with the hub on top. */
function atHub(options: HarnessOptions = {}): AppHarness {
  const harness = createAppHarness(options);
  harness.stack.push(createHubScene(harness.services));
  harness.loop.wake();
  harness.frames(1);
  return harness;
}

/** A harness with a running round on top. */
function inRound(options: HarnessOptions = {}): AppHarness {
  const harness = atHub(options);
  harness.navigation.startRound();
  harness.loop.wake();
  harness.frames(DISSOLVE_FRAMES);
  return harness;
}

afterEach(() => {
  vi.useRealTimers();
});

test('start: keep-awake and immersive at the dissolve start, the round after it', () => {
  const harness = atHub();
  harness.navigation.startRound();
  expect(harness.platform.calls).toEqual([
    { capability: 'keepAwake.set', argument: true },
    { capability: 'immersive.set', argument: true },
  ]);
  expect(harness.stack.top?.id).toBe('hub');
  harness.frames(DISSOLVE_FRAMES);
  expect(harness.stack.top?.id).toBe('bug-hunt-round');
  expect(harness.stack.depth).toBe(1);
  expect(harness.navigation.hasActiveRound).toBe(true);
  expect(harness.errors).toEqual([]);
});

test('Escape in a round gives exactly one pause overlay and one pause sound', () => {
  const harness = inRound();
  const playSfx = vi.spyOn(harness.mixer, 'playSfx');
  harness.press('pause', 'back');
  harness.frames(3);
  expect(harness.stack.depth).toBe(2);
  expect(harness.stack.top?.id).toBe('pause');
  expect(playSfx.mock.calls.filter(([id]) => id === 'ui-pause')).toHaveLength(1);
  expect(harness.navigation.isPauseOpen).toBe(true);
});

test('Escape in the pause overlay resumes exactly once', () => {
  const harness = inRound();
  harness.press('pause', 'back');
  harness.frames(2);
  harness.press('pause', 'back');
  harness.frames(2);
  expect(harness.stack.depth).toBe(1);
  expect(harness.stack.top?.id).toBe('bug-hunt-round');
  expect(harness.navigation.isPauseOpen).toBe(false);
});

test('two pause or two resume calls act once', () => {
  const harness = inRound();
  harness.navigation.pauseRound('player');
  harness.navigation.pauseRound('player');
  expect(harness.stack.depth).toBe(2);
  harness.navigation.resumeRound();
  harness.navigation.resumeRound();
  expect(harness.stack.depth).toBe(1);
  expect(harness.stack.top?.id).toBe('bug-hunt-round');
});

test('the audio suspends 150 ms after a pause unless resume or quit come first', () => {
  vi.useFakeTimers();
  const harness = inRound();
  const suspend = vi.spyOn(harness.mixer, 'suspend');
  harness.navigation.pauseRound('player');
  vi.advanceTimersByTime(100);
  harness.navigation.resumeRound();
  vi.advanceTimersByTime(200);
  expect(suspend).not.toHaveBeenCalled();
  harness.navigation.pauseRound('hidden');
  harness.navigation.toHub();
  vi.advanceTimersByTime(200);
  expect(suspend).not.toHaveBeenCalled();
  harness.frames(DISSOLVE_FRAMES);
  expect(harness.stack.top?.id).toBe('hub');
  expect(harness.platform.calls.slice(-2)).toEqual([
    { capability: 'keepAwake.set', argument: false },
    { capability: 'immersive.set', argument: false },
  ]);
});

test('an unanswered pause suspends the audio after 150 ms', () => {
  vi.useFakeTimers();
  const harness = inRound();
  const suspend = vi.spyOn(harness.mixer, 'suspend');
  harness.navigation.pauseRound('blur');
  vi.advanceTimersByTime(150);
  expect(suspend).toHaveBeenCalledOnce();
});

test('finishing, continuing and entering initials saves the entry and highlights it', () => {
  const harness = inRound();
  harness.navigation.finishRound(result(12));
  expect(harness.stack.top?.id).toBe('game-over');
  expect(harness.navigation.hasActiveRound).toBe(false);
  harness.navigation.continueAfterGameOver(result(12));
  expect(harness.stack.top?.id).toBe('initials');
  expect(harness.stack.depth).toBe(1);
  harness.navigation.submitInitials(result(12), 'R15');
  expect(harness.stack.top?.id).toBe('top10');
  const document = harness.services.save.get();
  expect(document.scores.bugHunt.arcade).toEqual([
    { initials: 'R15', score: 12, date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as unknown },
  ]);
  expect(document.meta.lastInitials).toBe('R15');
});

test('a score of 0 goes straight to the top 10', () => {
  const harness = inRound();
  harness.navigation.finishRound(result(0));
  harness.navigation.continueAfterGameOver(result(0));
  expect(harness.stack.top?.id).toBe('top10');
});

test('after boot: the first launch plays the full intro, intro off goes to the hub', () => {
  const first = createAppHarness();
  first.navigation.afterBoot();
  expect(first.stack.top?.id).toBe('intro');
  expect(first.services.save.get().meta.hasCompletedFirstLaunch).toBe(true);
  const fresh = createDefaultSave();
  const document = {
    ...fresh,
    settings: { ...fresh.settings, intro: 'off' as const },
    meta: { ...fresh.meta, hasCompletedFirstLaunch: true },
  };
  const later = createAppHarness({ document });
  later.navigation.afterBoot();
  expect(later.stack.top?.id).toBe('hub');
});
