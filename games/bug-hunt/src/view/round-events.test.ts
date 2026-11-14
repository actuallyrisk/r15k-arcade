import { describe, expect, test } from 'vitest';
import type { SimEvent } from '../sim/events.ts';
import { createAimLatch } from './aim-latch.ts';
import { roundSfx } from './audio-events.ts';
import { comboPipsFilled } from './combo-pips.ts';
import { resumeAnnouncement, roundA11yTree, roundAnnouncements } from './round-a11y.ts';
import { referenceLayout, translator } from './test-support/round-fixtures.ts';
import { roundHudPlacement } from './hud-placement.ts';

const STATS = {
  bugsCaught: 0,
  goldenCaught: 0,
  bombsCaught: 0,
  misses: 0,
  bombsDodged: 0,
  bestStreak: 0,
};
const BUG: SimEvent = {
  kind: 'catch',
  itemId: 1,
  itemKind: 'bug',
  points: 1,
  multiplier: 1,
  x: 0,
  fall: 0.9,
};

describe('roundSfx', () => {
  test('maps every sounding event', () => {
    expect(roundSfx([{ kind: 'countdown', digit: 3 }], 0)).toEqual(['tick']);
    expect(roundSfx([{ kind: 'time-tick', secondsLeft: 2 }], 0)).toEqual(['tick']);
    expect(roundSfx([{ kind: 'go' }], 0)).toEqual(['go']);
    expect(roundSfx([BUG], 0)).toEqual(['bug-catch']);
    expect(roundSfx([{ ...BUG, itemKind: 'golden' }], 0)).toEqual(['gold-catch']);
    expect(roundSfx([{ kind: 'bomb', itemId: 2, penalty: 3, x: 0, fall: 0.9 }], 0)).toEqual([
      'bomb',
    ]);
    expect(
      roundSfx(
        [
          { kind: 'spawn', itemId: 3, itemKind: 'bug' },
          { kind: 'combo-reset', previous: 2 },
        ],
        0,
      ),
    ).toEqual([]);
  });

  test('a combo stage in the same step replaces the catch sound', () => {
    expect(roundSfx([BUG, { kind: 'combo-stage', multiplier: 2 }], 0)).toEqual(['combo-2']);
    expect(
      roundSfx([{ ...BUG, itemKind: 'golden' }, BUG, { kind: 'combo-stage', multiplier: 4 }], 0),
    ).toEqual(['combo-4']);
  });

  test('the round end plays new-record only above the best and above 0', () => {
    expect(roundSfx([{ kind: 'round-end', score: 12, stats: STATS }], 10)).toEqual(['new-record']);
    expect(roundSfx([{ kind: 'round-end', score: 10, stats: STATS }], 10)).toEqual(['round-over']);
    expect(roundSfx([{ kind: 'round-end', score: 0, stats: STATS }], 0)).toEqual(['round-over']);
  });
});

describe('announcements and a11y tree', () => {
  test('the round start merges with the first digit, later digits, go, 5 s left and combo stages follow', () => {
    const i18n = translator();
    const events: readonly SimEvent[] = [
      { kind: 'countdown', digit: 3 },
      { kind: 'countdown', digit: 2 },
      { kind: 'go' },
      { kind: 'time-tick', secondsLeft: 5 },
      { kind: 'time-tick', secondsLeft: 4 },
      { kind: 'combo-stage', multiplier: 3 },
      BUG,
    ];
    expect(roundAnnouncements(events, i18n)).toEqual([
      'Round starts. Catch bugs, avoid bombs. 3',
      '2',
      'Go!',
      '5 seconds left',
      'Combo times 3',
    ]);
    expect(roundAnnouncements([{ kind: 'time-tick', secondsLeft: 5 }], translator('de'))).toEqual([
      'Noch 5 Sekunden',
    ]);
  });

  test('the resume countdown announces "Resuming" with the first digit, then digits', () => {
    expect(resumeAnnouncement(3, true, translator())).toBe('Resuming. 3');
    expect(resumeAnnouncement(2, false, translator('de'))).toBe('2');
  });
});

describe('round a11y tree', () => {
  test('the tree holds the field text and the pause button at its hit rect', () => {
    const layout = referenceLayout('phone-portrait');
    const tree = roundA11yTree(translator(), layout);
    expect(tree.title).toBe('BUG HUNT');
    expect(tree.nodes).toEqual([
      expect.objectContaining({ kind: 'text', rect: layout.field, label: 'Playfield' }),
      expect.objectContaining({
        kind: 'button',
        rect: roundHudPlacement(layout).pauseHit,
        label: 'Pause',
      }),
    ]);
    expect(roundA11yTree(translator(), undefined).nodes).toEqual([]);
  });
});

describe('combo pips', () => {
  test('fill towards the next stage, full right before it and at 4×', () => {
    const filled = [0, 1, 4, 5, 6, 7, 9, 10, 12, 15, 19, 20, 50].map(comboPipsFilled);
    expect(filled).toEqual([0, 1, 4, 0, 1, 2, 4, 0, 0, 2, 4, 4, 4]);
  });
});

describe('aim latch', () => {
  test('frames with 0, 1, 2, 0 and 1 steps deliver every tap exactly once', () => {
    const latch = createAimLatch();
    const frames: readonly { readonly tap: number | undefined; readonly steps: number }[] = [
      { tap: 10, steps: 0 },
      { tap: undefined, steps: 1 },
      { tap: 20, steps: 2 },
      { tap: 30, steps: 0 },
      { tap: undefined, steps: 1 },
    ];
    const delivered: (number | undefined)[] = [];
    for (const frame of frames) {
      latch.offer(frame.tap);
      for (let index = 0; index < frame.steps; index += 1) {
        delivered.push(latch.take());
      }
    }
    expect(delivered).toEqual([10, 20, undefined, 30]);
  });

  test('a newer aim replaces an older one, clear forgets it', () => {
    const latch = createAimLatch();
    latch.offer(1);
    latch.offer(2);
    expect(latch.take()).toBe(2);
    latch.offer(3);
    latch.clear();
    expect(latch.take()).toBeUndefined();
  });
});
