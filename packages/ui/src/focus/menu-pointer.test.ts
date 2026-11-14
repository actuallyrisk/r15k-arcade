import { expect, test } from 'vitest';
import { createIdleInputFrame } from '@r15k/engine';
import type { InputFrame, Point } from '@r15k/engine';
import {
  makeButton,
  makeInitials,
  makeSelector,
  makeSlider,
  makeToggle,
  menuInput,
  pointer,
  release,
} from '../test-support/frames.ts';
import { selectorArrowRects, sliderTrackRect } from '../widgets/widget-geometry.ts';
import type { Widget } from '../widgets/widget-types.ts';
import { MENU_DRAG_START_CSS } from './menu-pointer.ts';
import { createMenuState, reduceMenu } from './menu-reducer.ts';
import type { MenuInput, MenuState } from './menu-reducer.ts';

const IDLE = createIdleInputFrame('touch');
const START = makeButton('start', { x: 10, y: 0, width: 60, height: 16 });

/** A press at `down` in this frame. */
function pressAt(down: Point): InputFrame {
  return { ...IDLE, pointer: pointer(down, { isDown: true, wasPressed: true }) };
}

/** The pointer held at `position` after pressing at `down`. */
function holdAt(down: Point, position: Point): InputFrame {
  return { ...IDLE, pointer: pointer(position, { down, isDown: true, wasPressed: false }) };
}

/** The pointer released at `position` after pressing at `down`. */
function releaseAt(down: Point, position: Point, durationMs = 100): InputFrame {
  return {
    ...IDLE,
    pointer: pointer(position, { down, isDown: false, wasPressed: false }),
    releases: [release(down, position, durationMs)],
  };
}

/** Runs frames through the reducer and collects every intent. */
function run(
  state: MenuState,
  frames: readonly InputFrame[],
  overrides: Partial<MenuInput> = {},
): { state: MenuState; intents: unknown[]; scrollBy: number } {
  let current = state;
  const intents: unknown[] = [];
  let scrollBy = 0;
  for (const frame of frames) {
    const step = reduceMenu(current, menuInput(frame, overrides));
    current = step.state;
    intents.push(...step.intents);
    scrollBy += step.scrollBy;
  }
  return { state: current, intents, scrollBy };
}

test('a press longer than 300 ms released inside the button activates it and focuses it', () => {
  const state = createMenuState([makeToggle('mute'), START], { focusId: 'mute' });
  const pressed = reduceMenu(state, menuInput(pressAt({ x: 20, y: 5 })));
  expect(pressed.state.press).toMatchObject({ widgetId: 'start', isScrollDrag: false });
  const done = run(pressed.state, [releaseAt({ x: 20, y: 5 }, { x: 22, y: 6 }, 2000)]);
  expect(done.intents).toEqual([{ kind: 'activate', id: 'start' }]);
  expect(done.state).toMatchObject({ focusId: 'start', press: undefined });
});

test('press and release in one frame activates; a release outside the hit rect does not', () => {
  const tap = {
    ...releaseAt({ x: 20, y: 5 }, { x: 20, y: 5 }),
    pointer: pointer({ x: 20, y: 5 }, { isDown: false, wasPressed: true }),
  };
  expect(run(createMenuState([START]), [tap]).intents).toEqual([{ kind: 'activate', id: 'start' }]);
  const away = run(createMenuState([START]), [
    pressAt({ x: 20, y: 5 }),
    releaseAt({ x: 20, y: 5 }, { x: 150, y: 90 }),
  ]);
  expect(away.intents).toEqual([]);
});

test('8 CSS px of travel on fold-cover (k = 1.143) is still an activation', () => {
  const travel = Math.round(8 / 1.143);
  const frames = [
    pressAt({ x: 20, y: 5 }),
    holdAt({ x: 20, y: 5 }, { x: 20, y: 5 + travel }),
    releaseAt({ x: 20, y: 5 }, { x: 20, y: 5 + travel }),
  ];
  const scrollRegion = { x: 0, y: 0, width: 200, height: 120 };
  const result = run(createMenuState([START]), frames, {
    cssPerLogical: 1.143,
    minTouchTarget: 42,
    scrollRegion,
  });
  expect(result.intents).toEqual([{ kind: 'activate', id: 'start' }]);
  expect(result.scrollBy).toBe(0);
});

test('a scroll drag inside the region scrolls and never activates', () => {
  const scrollRegion = { x: 0, y: 0, width: 200, height: 120 };
  const travel = Math.ceil(MENU_DRAG_START_CSS / 3.5) + 4;
  const frames = [
    pressAt({ x: 20, y: 5 }),
    holdAt({ x: 20, y: 5 }, { x: 20, y: 5 + travel }),
    releaseAt({ x: 20, y: 5 }, { x: 20, y: 5 }),
  ];
  const result = run(createMenuState([START]), frames, { scrollRegion });
  expect(result.intents).toEqual([]);
  expect(result.scrollBy).toBe(-travel);
  const moved = run(createMenuState([START]), frames.slice(0, 2), { scrollRegion });
  expect(moved.scrollBy).toBe(-travel);
  expect(moved.state.press?.isScrollDrag).toBe(true);
});

test('dragging a slider track changes the value every frame it changes, one move sound per frame', () => {
  const slider = makeSlider('music', { x: 10, y: 40, width: 160, height: 16 });
  const track = sliderTrackRect(slider, { text: { font: 'r15k-8', zoom: 1 }, minTouchTarget: 14 });
  const down = { x: track.x + 1, y: track.y + 1 };
  const end = { x: track.x + track.width, y: track.y + 1 };
  const first = reduceMenu(createMenuState([slider]), menuInput(pressAt(down)));
  expect(first.intents).toEqual([{ kind: 'change', id: 'music', value: 0 }]);
  const second = reduceMenu(first.state, menuInput(holdAt(down, end)));
  expect(second).toMatchObject({
    intents: [{ kind: 'change', id: 'music', value: 100 }],
    sounds: ['move'],
  });
  expect(run(second.state, [releaseAt(down, end)]).intents).toEqual([]);
});

test('a release on the slider label focuses it without changing the value', () => {
  const slider = makeSlider('music', { x: 10, y: 40, width: 160, height: 16 });
  const result = run(createMenuState([START, slider]), [
    pressAt({ x: 12, y: 46 }),
    releaseAt({ x: 12, y: 46 }, { x: 12, y: 46 }),
  ]);
  expect(result.intents).toEqual([]);
  expect(result.state.focusId).toBe('music');
});

test('selector taps: previous arrow → previous, next arrow and label → next', () => {
  const selector = makeSelector('theme', { x: 10, y: 60, width: 160, height: 16 });
  const arrows = selectorArrowRects(selector, {
    text: { font: 'r15k-8', zoom: 1 },
    minTouchTarget: 14,
  });
  const tapAt = (point: Point): unknown[] =>
    run(createMenuState([selector]), [pressAt(point), releaseAt(point, point)]).intents;
  const centre = (rect: { x: number; y: number; width: number; height: number }): Point => ({
    x: rect.x + 3,
    y: rect.y + 7,
  });
  expect(tapAt(centre(arrows.previous))).toEqual([
    { kind: 'select', id: 'theme', optionId: 'dark' },
  ]);
  expect(tapAt(centre(arrows.next))).toEqual([{ kind: 'select', id: 'theme', optionId: 'light' }]);
  expect(tapAt({ x: 14, y: 66 })).toEqual([{ kind: 'select', id: 'theme', optionId: 'light' }]);
});

test('initials taps: upper half letter −1, lower half +1, the cursor moves to that box', () => {
  const initials = makeInitials('i', { x: 10, y: 10, width: 72, height: 46 });
  const tapAt = (point: Point): unknown[] =>
    run(createMenuState([initials]), [pressAt(point), releaseAt(point, point)]).intents;
  expect(tapAt({ x: 40, y: 14 })).toEqual([
    { kind: 'initials', id: 'i', letters: 'A9A', cursor: 1, isComplete: false },
  ]);
  expect(tapAt({ x: 70, y: 50 })).toEqual([
    { kind: 'initials', id: 'i', letters: 'AAB', cursor: 2, isComplete: false },
  ]);
});

test('more-indicators scroll by one hidden row; the wheel scrolls the region', () => {
  const scrollRegion = { x: 0, y: 20, width: 200, height: 60 };
  const below = { x: 0, y: 66, width: 200, height: 14 };
  const rows: Widget[] = [
    makeToggle('a', { x: 10, y: 22, width: 160, height: 20 }),
    makeToggle('b', { x: 10, y: 60, width: 160, height: 20 }),
  ];
  const tap = { x: 100, y: 70 };
  const result = run(createMenuState(rows), [pressAt(tap), releaseAt(tap, tap)], {
    scrollRegion,
    moreIndicators: { above: undefined, below },
  });
  expect(result).toMatchObject({ intents: [], scrollBy: 20 });
  const wheel = reduceMenu(
    createMenuState(rows),
    menuInput({ ...IDLE, wheelDelta: 12 }, { scrollRegion }),
  );
  expect(wheel.scrollBy).toBe(12);
  expect(reduceMenu(createMenuState(rows), menuInput({ ...IDLE, wheelDelta: 12 })).scrollBy).toBe(
    0,
  );
});

test('a cancelled press is dropped without activation', () => {
  const pressed = reduceMenu(createMenuState([START]), menuInput(pressAt({ x: 20, y: 5 })));
  const cancelled = reduceMenu(pressed.state, menuInput(IDLE));
  expect(cancelled.state.press).toBeUndefined();
  expect(cancelled.intents).toEqual([]);
});
