import { expect, test } from 'vitest';
import { ICONS } from '../text/icons.ts';
import { promptGlyph, shouldShowFocusRing } from '../prompts/prompts.ts';
import {
  makeButton,
  makeInitials,
  makeSelector,
  makeSlider,
  makeToggle,
} from '../test-support/frames.ts';
import { initialsHitAreas } from '../widgets/widget-geometry.ts';
import { nextFocusable } from './focus-order.ts';
import { menuA11yNodes } from './menu-a11y.ts';
import { createMenuState } from './menu-reducer.ts';
import { hitRect, widgetAt } from './pointer-hit.ts';

test('hitRect grows small rects centred to the touch target and keeps large ones', () => {
  expect(hitRect({ x: 10, y: 10, width: 10, height: 4 }, 14)).toEqual({
    x: 8,
    y: 5,
    width: 14,
    height: 14,
  });
  expect(hitRect({ x: 0, y: 0, width: 30, height: 20 }, 14)).toEqual({
    x: 0,
    y: 0,
    width: 30,
    height: 20,
  });
});

test('widgetAt prefers the drawn rect, then the nearest centre', () => {
  const left = makeButton('left', { x: 0, y: 0, width: 10, height: 10 });
  const right = makeButton('right', { x: 12, y: 0, width: 10, height: 10 });
  expect(widgetAt([left, right], { x: 13, y: 5 }, 30)?.id).toBe('right');
  expect(widgetAt([left, right], { x: 16, y: 12 }, 30)?.id).toBe('right');
  expect(widgetAt([left, right], { x: 3, y: 18 }, 30)?.id).toBe('left');
  expect(widgetAt([left, right], { x: 100, y: 100 }, 30)).toBeUndefined();
});

test('nextFocusable wraps, skips disabled widgets and starts at either end', () => {
  const widgets = [makeButton('a'), { ...makeButton('b'), isDisabled: true }, makeButton('c')];
  expect(nextFocusable(widgets, 'a', 1)).toBe('c');
  expect(nextFocusable(widgets, 'c', 1)).toBe('a');
  expect(nextFocusable(widgets, undefined, -1)).toBe('c');
  expect(nextFocusable(widgets, 'missing', 1)).toBe('a');
  expect(nextFocusable([{ ...makeButton('x'), isDisabled: true }], undefined, 1)).toBeUndefined();
});

test('a11y nodes sit at hit rects; a corner icon button gets at least the touch target', () => {
  const gear = {
    ...makeButton('gear', { x: 180, y: 2, width: 12, height: 12 }),
    variant: 'icon' as const,
    icon: 'gear' as const,
  };
  const state = createMenuState([
    gear,
    makeToggle('mute'),
    makeSlider('music'),
    makeSelector('theme'),
  ]);
  const nodes = menuA11yNodes(state, {
    minTouchTarget: 36,
    initialsLetter: (index) => `Letter ${String(index + 1)}`,
  });
  expect(nodes.map((node) => node.kind)).toEqual(['button', 'switch', 'slider', 'select']);
  expect(nodes[0]?.rect).toEqual(hitRect(gear.rect, 36));
  expect(nodes[0]?.rect.width).toBeGreaterThanOrEqual(36);
  expect(nodes[1]).toMatchObject({ isOn: false, label: 'Mute' });
  expect(nodes[2]).toMatchObject({ value: 50, min: 0, max: 100, step: 10, valueText: '50 %' });
  expect(nodes[3]).toMatchObject({ selectedId: 'system' });
});

test('initials are exposed as three letter sliders at their boxes', () => {
  const initials = { ...makeInitials('i'), letters: 'R1K' };
  const nodes = menuA11yNodes(createMenuState([initials]), {
    minTouchTarget: 36,
    initialsLetter: (index) => `Letter ${String(index + 1)} of 3`,
  });
  expect(nodes.map((node) => node.id)).toEqual(['i.0', 'i.1', 'i.2']);
  expect(nodes[0]).toMatchObject({
    kind: 'slider',
    value: 17,
    valueText: 'R',
    label: 'Letter 1 of 3',
    max: 35,
  });
  expect(nodes[1]).toMatchObject({ value: 27, valueText: '1' });
  expect(nodes[2]?.rect).toEqual(initialsHitAreas(initials, 36)[2]?.box);
});

test('prompts follow the device; the focus ring shows for keyboard and gamepad only', () => {
  expect(promptGlyph('confirm', 'keyboard')).toBe(ICONS['key-enter']);
  expect(promptGlyph('back', 'keyboard')).toBe(ICONS['key-escape']);
  expect(promptGlyph('pause', 'keyboard')).toBe('P');
  expect(promptGlyph('confirm', 'gamepad')).toBe(ICONS['button-a']);
  expect(promptGlyph('back', 'gamepad')).toBe(ICONS['button-b']);
  expect(promptGlyph('pause', 'gamepad')).toBe(ICONS['button-start']);
  expect(promptGlyph('confirm', 'touch')).toBe(ICONS.touch);
  expect(promptGlyph('back', 'mouse')).toBe(ICONS.back);
  expect(promptGlyph('pause', 'touch')).toBe(ICONS.pause);
  expect(promptGlyph('confirm', 'mouse')).toBe(ICONS.mouse);
  expect(shouldShowFocusRing('keyboard')).toBe(true);
  expect(shouldShowFocusRing('gamepad')).toBe(true);
  expect(shouldShowFocusRing('touch')).toBe(false);
  expect(shouldShowFocusRing('mouse')).toBe(false);
});
