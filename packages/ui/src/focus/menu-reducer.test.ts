import { expect, test } from 'vitest';
import { createIdleInputFrame } from '@r15k/engine';
import {
  keys,
  makeButton,
  makeInitials,
  makeSelector,
  makeSlider,
  makeToggle,
  menuInput,
} from '../test-support/frames.ts';
import type { Widget } from '../widgets/widget-types.ts';
import { applyA11yEvent, createMenuState, reduceMenu, replaceWidgets } from './menu-reducer.ts';

const WIDGETS: readonly Widget[] = [
  makeButton('start'),
  makeToggle('mute'),
  makeSlider('music'),
  makeSelector('theme'),
  { ...makeButton('off', { x: 10, y: 80, width: 60, height: 16 }), isDisabled: true },
];

/** A vertical menu focused on an id. */
function menu(
  focusId: string,
  widgets: readonly Widget[] = WIDGETS,
): ReturnType<typeof createMenuState> {
  return createMenuState(widgets, { focusId });
}

test('createMenuState focuses the first enabled widget unless asked otherwise', () => {
  expect(createMenuState(WIDGETS).focusId).toBe('start');
  expect(createMenuState(WIDGETS, { focusId: 'off' }).focusId).toBe('start');
  expect(createMenuState(WIDGETS, { focusId: 'music', navigation: 'horizontal' })).toMatchObject({
    focusId: 'music',
    navigation: 'horizontal',
  });
  expect(createMenuState([]).focusId).toBeUndefined();
});

test('up/down move the focus (wrapping, skipping disabled) with sound move', () => {
  const down = reduceMenu(menu('theme'), menuInput(keys('down')));
  expect(down.state.focusId).toBe('start');
  expect(down.sounds).toEqual(['move']);
  expect(reduceMenu(menu('start'), menuInput(keys('up'))).state.focusId).toBe('theme');
  const horizontal = createMenuState(WIDGETS, { navigation: 'horizontal' });
  expect(reduceMenu(horizontal, menuInput(keys('down'))).state.focusId).toBe('start');
  expect(reduceMenu(horizontal, menuInput(keys('right'))).state.focusId).toBe('mute');
});

test('left/right change slider, selector and toggle values; buttons ignore them', () => {
  const slider = reduceMenu(menu('music'), menuInput(keys('left')));
  expect(slider.intents).toEqual([{ kind: 'change', id: 'music', value: 40 }]);
  expect(slider.sounds).toEqual(['move']);
  expect(slider.state.widgets[2]).toMatchObject({ value: 40 });
  expect(reduceMenu(menu('theme'), menuInput(keys('left'))).intents).toEqual([
    { kind: 'select', id: 'theme', optionId: 'dark' },
  ]);
  expect(reduceMenu(menu('mute'), menuInput(keys('right'))).intents).toEqual([
    { kind: 'toggle', id: 'mute', isOn: true },
  ]);
  expect(reduceMenu(menu('start'), menuInput(keys('right'))).intents).toEqual([]);
  const atMax = createMenuState([{ ...makeSlider('m'), value: 100 }]);
  expect(reduceMenu(atMax, menuInput(keys('right'))).intents).toEqual([]);
});

test('confirm activates, toggles and selects next with sound confirm; sliders ignore it', () => {
  expect(reduceMenu(menu('start'), menuInput(keys('confirm')))).toMatchObject({
    intents: [{ kind: 'activate', id: 'start' }],
    sounds: ['confirm'],
  });
  expect(reduceMenu(menu('mute'), menuInput(keys('confirm'))).intents).toEqual([
    { kind: 'toggle', id: 'mute', isOn: true },
  ]);
  expect(reduceMenu(menu('theme'), menuInput(keys('confirm'))).intents).toEqual([
    { kind: 'select', id: 'theme', optionId: 'light' },
  ]);
  expect(reduceMenu(menu('music'), menuInput(keys('confirm'))).intents).toEqual([]);
});

test('back emits the back intent with sound back', () => {
  expect(reduceMenu(menu('music'), menuInput(keys('back')))).toMatchObject({
    intents: [{ kind: 'back' }],
    sounds: ['back'],
  });
});

test('focused initials take up/down/left/right, confirm, typed letters and back', () => {
  const state = createMenuState([makeInitials('i'), makeButton('ok')]);
  expect(reduceMenu(state, menuInput(keys('down'))).intents).toEqual([
    { kind: 'initials', id: 'i', letters: 'BAA', cursor: 0, isComplete: false },
  ]);
  expect(reduceMenu(state, menuInput(keys('right'))).state.widgets[0]).toMatchObject({ cursor: 1 });
  expect(reduceMenu(state, menuInput(keys('left'))).intents).toEqual([]);
  const typed = reduceMenu(
    state,
    menuInput({ ...createIdleInputFrame(), typedChars: ['R', '1', '?', 'K', 'X'] }),
  );
  expect(typed.state.widgets[0]).toMatchObject({ letters: 'R1X', cursor: 2 });
  expect(typed.sounds).toEqual(['move', 'move', 'move', 'move']);
  const last = createMenuState([{ ...makeInitials('i'), cursor: 2 }]);
  expect(reduceMenu(last, menuInput(keys('confirm')))).toMatchObject({
    intents: [{ isComplete: true }],
    sounds: ['confirm'],
  });
  expect(reduceMenu(state, menuInput(keys('back'))).intents).toEqual([{ kind: 'back' }]);
});

test('typed characters do nothing unless initials have the focus', () => {
  const step = reduceMenu(
    menu('start'),
    menuInput({ ...createIdleInputFrame(), typedChars: ['A'] }),
  );
  expect(step.intents).toEqual([]);
});

test('replaceWidgets keeps the focus while the id exists', () => {
  const state = menu('music');
  expect(replaceWidgets(state, WIDGETS.slice(1)).focusId).toBe('music');
  expect(replaceWidgets(state, [makeButton('other')]).focusId).toBe('other');
  const pressed = {
    ...state,
    press: { widgetId: 'music', pointerId: 1, isScrollDrag: false, lastY: 0 },
  };
  expect(replaceWidgets(pressed, WIDGETS).press).toBeDefined();
  expect(replaceWidgets(pressed, [makeButton('other')]).press).toBeUndefined();
});

test('a11y events: focus, activate, slider value, select and initials letters', () => {
  const state = menu('start');
  expect(applyA11yEvent(state, { kind: 'focus', id: 'theme' })).toMatchObject({
    state: { focusId: 'theme' },
    sounds: ['move'],
  });
  expect(applyA11yEvent(state, { kind: 'activate', id: 'start' }).intents).toEqual([
    { kind: 'activate', id: 'start' },
  ]);
  expect(applyA11yEvent(state, { kind: 'value', id: 'music', value: 73 }).intents).toEqual([
    { kind: 'change', id: 'music', value: 70 },
  ]);
  expect(applyA11yEvent(state, { kind: 'select', id: 'theme', optionId: 'dark' }).intents).toEqual([
    { kind: 'select', id: 'theme', optionId: 'dark' },
  ]);
  expect(applyA11yEvent(state, { kind: 'select', id: 'theme', optionId: 'nope' }).intents).toEqual(
    [],
  );
  expect(applyA11yEvent(state, { kind: 'activate', id: 'off' }).intents).toEqual([]);
  expect(applyA11yEvent(state, { kind: 'focus', id: 'missing' }).state.focusId).toBe('start');
  const initials = createMenuState([makeButton('ok'), makeInitials('i')]);
  const letter = applyA11yEvent(initials, { kind: 'value', id: 'i.1', value: 35 });
  expect(letter.intents).toEqual([
    { kind: 'initials', id: 'i', letters: 'A9A', cursor: 1, isComplete: false },
  ]);
  expect(letter.state.focusId).toBe('i');
  expect(applyA11yEvent(initials, { kind: 'focus', id: 'i.2' }).state.widgets[1]).toMatchObject({
    cursor: 2,
  });
  expect(applyA11yEvent(initials, { kind: 'focus', id: 'i.7' }).intents).toEqual([]);
});
