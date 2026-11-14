import { expect, test } from 'vitest';
import {
  makeButton,
  makeInitials,
  makeSelector,
  makeSlider,
  makeToggle,
  TEXT,
} from '../test-support/frames.ts';
import { INITIALS_ALPHABET, INITIALS_LENGTH, stepInitials, typeInitial } from './initials.ts';
import { layoutMenuColumn, rowHeightFor } from './menu-layout.ts';
import {
  initialsHitAreas,
  initialsSize,
  rowLines,
  selectorArrowRects,
  sliderTrackRect,
} from './widget-geometry.ts';

const ZOOM_2 = { font: 'r15k-8', zoom: 2 } as const;

test('rowLines: one line when label + gap + widest value fit, else two', () => {
  const wide = rowLines(makeSelector('s', { x: 0, y: 0, width: 200, height: 16 }), {
    text: TEXT,
    gap: 4,
  });
  expect(wide.isTwoLine).toBe(false);
  expect(wide.value.x + wide.value.width).toBe(200);
  const label = {
    ...makeSelector('s', { x: 0, y: 0, width: 120, height: 28 }),
    label: 'Reduced motion',
  };
  const narrow = rowLines(label, { text: TEXT, gap: 4 });
  expect(narrow.isTwoLine).toBe(true);
  expect(narrow.value.y).toBeGreaterThan(narrow.label.y);
  expect(rowLines(makeButton('b'), { text: TEXT, gap: 4 })).toMatchObject({ isTwoLine: false });
  expect(
    rowLines(makeToggle('t', { x: 0, y: 0, width: 300, height: 16 }), { text: ZOOM_2, gap: 8 })
      .isTwoLine,
  ).toBe(false);
});

test('the slider track is 3 px high inside the value part and grows with the room', () => {
  const short = sliderTrackRect(makeSlider('s', { x: 0, y: 0, width: 120, height: 16 }), {
    text: TEXT,
    minTouchTarget: 14,
  });
  const long = sliderTrackRect(makeSlider('s', { x: 0, y: 0, width: 300, height: 16 }), {
    text: TEXT,
    minTouchTarget: 14,
  });
  expect(short.height).toBe(3);
  expect(long.width).toBeGreaterThan(short.width);
  expect(long.width).toBe(80);
  expect(short.y).toBe(6);
});

test('selector arrow rects are widened to the touch target around the arrows', () => {
  const widget = makeSelector('s', { x: 0, y: 0, width: 200, height: 16 });
  const { previous, next } = selectorArrowRects(widget, { text: TEXT, minTouchTarget: 20 });
  expect(previous.width).toBe(20);
  expect(previous.height).toBe(20);
  expect(next.x + next.width).toBeGreaterThan(200);
  expect(previous.x).toBeLessThan(next.x);
});

test('initials hit areas: three boxes ≥ touch target wide, ≥ 2 × touch target high, halves', () => {
  const size = initialsSize(36, TEXT);
  const widget = makeInitials('i', { x: 0, y: 0, ...size });
  const areas = initialsHitAreas(widget, 36);
  expect(areas).toHaveLength(INITIALS_LENGTH);
  for (const area of areas) {
    expect(area.box.width).toBeGreaterThanOrEqual(36);
    expect(area.box.height).toBeGreaterThanOrEqual(72);
    expect(area.up.height + area.down.height).toBe(area.box.height);
    expect(area.down.y).toBe(area.up.y + area.up.height);
  }
  expect((areas[1]?.box.x ?? 0) - (areas[0]?.box.x ?? 0)).toBeGreaterThan(36);
  expect(
    initialsHitAreas(makeInitials('i', { x: 0, y: 0, width: 30, height: 20 }), 36)[0]?.box.height,
  ).toBe(72);
});

test('initialsSize grows with the text zoom', () => {
  const small = initialsSize(14, TEXT);
  const large = initialsSize(14, ZOOM_2);
  expect(large.width).toBeGreaterThan(small.width);
  expect(small.height).toBeGreaterThanOrEqual(28);
});

test('stepInitials moves letters (wrapping) and the cursor (clamped); confirm completes at the end', () => {
  const widget = makeInitials('i');
  expect(stepInitials(widget, 'up')).toEqual({
    kind: 'initials',
    id: 'i',
    letters: '9AA',
    cursor: 0,
    isComplete: false,
  });
  expect(stepInitials(widget, 'down')).toMatchObject({ letters: 'BAA' });
  expect(stepInitials(widget, 'left')).toMatchObject({ cursor: 0 });
  expect(stepInitials(widget, 'right')).toMatchObject({ cursor: 1 });
  expect(stepInitials(widget, 'confirm')).toMatchObject({ cursor: 1, isComplete: false });
  expect(stepInitials({ ...widget, cursor: 2 }, 'confirm')).toMatchObject({
    cursor: 2,
    isComplete: true,
  });
  expect(stepInitials({ ...widget, letters: '', cursor: 1 }, 'down')).toMatchObject({
    letters: 'ABA',
  });
});

test('typeInitial sets the letter at the cursor and advances; other characters change nothing', () => {
  const widget = makeInitials('i');
  expect(typeInitial(widget, 'r')).toMatchObject({ letters: 'RAA', cursor: 1 });
  expect(typeInitial({ ...widget, cursor: 2 }, '7')).toMatchObject({ letters: 'AA7', cursor: 2 });
  expect(typeInitial(widget, '?')).toMatchObject({ letters: 'AAA', cursor: 0 });
  expect(INITIALS_ALPHABET).toHaveLength(36);
});

test('rowHeightFor: lines × (cap + 4) + 4, at least the touch target', () => {
  expect(rowHeightFor(TEXT, 14, 1)).toBe(16);
  expect(rowHeightFor(TEXT, 14, 2)).toBe(28);
  expect(rowHeightFor(TEXT, 36, 1)).toBe(36);
  expect(rowHeightFor(ZOOM_2, 18, 2)).toBe(44);
});

test('a column that fits does not scroll', () => {
  const layout = layoutMenuColumn({
    region: { x: 0, y: 0, width: 100, height: 100 },
    rowHeights: [20, 20],
    rowGap: 4,
    focusIndex: 0,
    scrollOffset: 30,
    minTouchTarget: 10,
  });
  expect(layout).toMatchObject({
    scrollOffset: 0,
    hasMoreAbove: false,
    hasMoreBelow: false,
    visible: [true, true],
  });
  expect(layout.rects[1]).toEqual({ x: 0, y: 24, width: 100, height: 20 });
});

test('a scrolled column keeps the focused row visible and parks hidden rows at the edges', () => {
  const options = {
    region: { x: 0, y: 10, width: 100, height: 60 },
    rowHeights: [20, 20, 20, 20, 20],
    rowGap: 0,
    scrollOffset: 0,
    minTouchTarget: 10,
  };
  const top = layoutMenuColumn({ ...options, focusIndex: 0 });
  expect(top).toMatchObject({ scrollOffset: 0, hasMoreAbove: false, hasMoreBelow: true });
  expect(top.moreBelow).toEqual({ x: 0, y: 60, width: 100, height: 10 });
  expect(top.visible).toEqual([true, true, false, false, false]);
  expect(top.rects[4]).toEqual({ x: 0, y: 50, width: 100, height: 20 });
  const middle = layoutMenuColumn({ ...options, focusIndex: 3 });
  expect(middle.hasMoreAbove && middle.hasMoreBelow).toBe(true);
  expect(middle.visible[3]).toBe(true);
  expect(middle.rects[0]?.y).toBe(10);
  const end = layoutMenuColumn({ ...options, focusIndex: 4, scrollOffset: 999 });
  expect(end).toMatchObject({ scrollOffset: 40, hasMoreBelow: false, moreBelow: undefined });
  expect(end.visible[4]).toBe(true);
});
