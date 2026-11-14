import { seedRng, SLOT } from '@r15k/engine';
import { describe, expect, test } from 'vitest';
import { TUNING } from '../content/tuning.ts';
import type { SimEvent } from '../sim/events.ts';
import { advanceRoundView, createRoundViewState } from './round-view-state.ts';
import type { RoundViewState } from './round-view-state.ts';

const STATS = {
  bugsCaught: 0,
  goldenCaught: 0,
  bombsCaught: 0,
  misses: 0,
  bombsDodged: 0,
  bestStreak: 0,
};
const CATCH: SimEvent = {
  kind: 'catch',
  itemId: 4,
  itemKind: 'golden',
  points: 10,
  multiplier: 2,
  x: 40,
  fall: 0.9,
};
const BOMB: SimEvent = { kind: 'bomb', itemId: 5, penalty: 3, x: 100, fall: 0.95 };

/** One step of the view with events. */
function apply(
  view: RoundViewState,
  events: readonly SimEvent[],
  isReducedMotion = false,
): RoundViewState {
  return advanceRoundView(view, { events, dt: 0, isReducedMotion });
}

describe('createRoundViewState', () => {
  test('starts empty with the shake RNG seeded from seed and salt', () => {
    const view = createRoundViewState(7);
    expect(view).toEqual({
      popups: [],
      banner: undefined,
      shakeSeconds: 0,
      shakeRng: seedRng(7 ^ TUNING.view.shakeSeedSalt),
      catHopSeconds: 0,
      catchTweens: [],
      resumeSeconds: 0,
    });
  });
});

describe('advanceRoundView events', () => {
  test('a catch adds a points popup (shown after the tween), a hop and a tween from event x and fall', () => {
    const view = apply(createRoundViewState(1), [CATCH]);
    expect(view.popups).toEqual([
      {
        kind: 'points',
        value: 10,
        slot: SLOT.gold,
        x: 45,
        ageSeconds: -TUNING.view.catchTweenSeconds,
      },
    ]);
    expect(view.catHopSeconds).toBe(TUNING.view.catHopSeconds);
    expect(view.catchTweens).toEqual([
      { itemKind: 'golden', fromX: 40, fromFall: 0.9, ageSeconds: 0 },
    ]);
  });

  test('a bug catch pops in blue ink', () => {
    const view = apply(createRoundViewState(1), [{ ...CATCH, itemKind: 'bug', points: 1 }]);
    expect(view.popups[0]).toMatchObject({ kind: 'points', value: 1, slot: SLOT.blueInk });
  });

  test('with reduced motion a catch adds no tween and its popup shows at once', () => {
    const view = apply(createRoundViewState(1), [CATCH], true);
    expect(view.catchTweens).toEqual([]);
    expect(view.popups[0]?.ageSeconds).toBe(0);
    expect(view.catHopSeconds).toBe(TUNING.view.catHopSeconds);
  });
});

describe('advanceRoundView bombs and other events', () => {
  test('a bomb adds a penalty popup, the Friday banner and a shake', () => {
    const view = apply(createRoundViewState(1), [BOMB]);
    expect(view.popups).toEqual([
      { kind: 'penalty', value: 3, slot: SLOT.pinkInk, x: 105, ageSeconds: 0 },
    ]);
    expect(view.banner).toEqual({
      key: 'bugHunt.banner.fridayDeploy',
      remainingSeconds: TUNING.view.bombBannerSeconds,
    });
    expect(view.shakeSeconds).toBe(TUNING.view.shakeSeconds);
  });

  test('with reduced motion a bomb never shakes', () => {
    expect(apply(createRoundViewState(1), [BOMB], true).shakeSeconds).toBe(0);
  });

  test('go shows the GO banner; other events change nothing', () => {
    const start = createRoundViewState(1);
    expect(apply(start, [{ kind: 'go' }]).banner).toEqual({
      key: 'bugHunt.countdown.go',
      remainingSeconds: TUNING.view.goBannerSeconds,
    });
    const quiet: readonly SimEvent[] = [
      { kind: 'countdown', digit: 2 },
      { kind: 'time-tick', secondsLeft: 4 },
      { kind: 'spawn', itemId: 1, itemKind: 'bug' },
      { kind: 'miss', itemId: 1, itemKind: 'bug', x: 3 },
      { kind: 'dodge', itemId: 2, x: 3 },
      { kind: 'combo-stage', multiplier: 2 },
      { kind: 'combo-reset', previous: 2 },
      { kind: 'round-end', score: 3, stats: STATS },
    ];
    expect(apply(start, quiet)).toEqual(start);
  });
});

describe('advanceRoundView popup cap', () => {
  test('popups are capped at the newest maxPopups', () => {
    const events = Array.from({ length: 10 }, (_, index): SimEvent => ({
      ...BOMB,
      penalty: index,
    }));
    const view = apply(createRoundViewState(1), events);
    expect(view.popups.map((popup) => popup.value)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe('advanceRoundView ageing', () => {
  test('ages and drops popups, tweens, banner and timers', () => {
    const view = apply(createRoundViewState(1), [CATCH, BOMB]);
    const resumed = { ...view, resumeSeconds: 1 };
    const later = advanceRoundView(resumed, { events: [], dt: 0.05, isReducedMotion: false });
    expect(later.popups.map((popup) => popup.ageSeconds)).toEqual([
      0.05 - TUNING.view.catchTweenSeconds,
      0.05,
    ]);
    expect(later.catchTweens[0]?.ageSeconds).toBe(0.05);
    expect(later.resumeSeconds).toBeCloseTo(0.95);
    const gone = advanceRoundView(later, { events: [], dt: 1, isReducedMotion: false });
    expect(gone).toMatchObject({
      popups: [],
      catchTweens: [],
      banner: undefined,
      shakeSeconds: 0,
      catHopSeconds: 0,
      resumeSeconds: 0,
    });
  });

  test('the shake RNG moves on only while shaking', () => {
    const view = apply(createRoundViewState(1), [BOMB]);
    const shaking = advanceRoundView(view, { events: [], dt: 0.01, isReducedMotion: false });
    expect(shaking.shakeRng).not.toEqual(view.shakeRng);
    const calm = advanceRoundView(createRoundViewState(1), {
      events: [],
      dt: 0.01,
      isReducedMotion: false,
    });
    expect(calm.shakeRng).toEqual(createRoundViewState(1).shakeRng);
  });

  test('is pure', () => {
    const view = Object.freeze(createRoundViewState(3));
    const before = JSON.stringify(view);
    advanceRoundView(view, { events: [CATCH, BOMB], dt: 0.1, isReducedMotion: false });
    expect(JSON.stringify(view)).toBe(before);
  });
});
