import { computeLayout, referenceSnapshot } from '@r15k/engine';
import type { Layout, ReferenceViewportId } from '@r15k/engine';
import { BUG_HUNT_GAME } from '@r15k/bug-hunt';
import { expect, test } from 'vitest';
import { computeTop10Layout } from './top10-layout.ts';

/** The layout of a reference viewport. */
function layoutOf(id: ReferenceViewportId): Layout {
  const layout = computeLayout(referenceSnapshot(id), BUG_HUNT_GAME.playfield);
  if (layout.kind !== 'ok') {
    throw new Error(`${id} is too small`);
  }
  return layout;
}

test('one column where the list fits, two columns on the short ultrawide display', () => {
  expect(computeTop10Layout(layoutOf('phone-landscape'), 'TOP 10').columns).toHaveLength(1);
  expect(computeTop10Layout(layoutOf('desktop'), 'TOP 10').columns).toHaveLength(1);
  const ultrawide = computeTop10Layout(layoutOf('ultrawide'), 'TOP 10');
  expect(ultrawide.columns).toHaveLength(2);
  expect(ultrawide.columns[0]?.height).toBe(5 * ultrawide.rowHeight);
});

test('compact layouts: one column and stacked footer buttons', () => {
  const cover = computeTop10Layout(layoutOf('fold-cover'), 'TOP 10');
  expect(cover.columns).toHaveLength(1);
  expect(cover.isFooterStacked).toBe(true);
  expect(cover.buttons[1].y).toBeGreaterThan(cover.buttons[0].y);
});

test('rows are cap height + 3 and the footer buttons are touch targets', () => {
  const layout = layoutOf('phone-portrait');
  const top10 = computeTop10Layout(layout, 'TOP 10');
  expect(top10.rowHeight).toBe(11);
  expect(top10.buttons[0].height).toBeGreaterThanOrEqual(layout.minTouchTarget);
});
