import { expect, test } from 'vitest';
import { SLOT } from '@r15k/engine';
import type { DrawTarget } from '@r15k/engine';
import {
  makeButton,
  makeInitials,
  makeSelector,
  makeSlider,
  makeTarget,
  makeToggle,
  TEXT,
} from '../test-support/frames.ts';
import { UI_THEME } from '../theme/ui-theme.ts';
import { drawWidget } from './draw-widget.ts';
import { drawDialog, layoutDialog } from './dialog.ts';
import type { Widget, WidgetDrawOptions } from './widget-types.ts';

const NORMAL: WidgetDrawOptions = {
  text: TEXT,
  isFocused: false,
  hasFocusRing: true,
  isPressed: false,
};

/** The slot at a pixel. */
function at(target: DrawTarget, x: number, y: number): number {
  return target.framebuffer.pixels[y * target.framebuffer.width + x] ?? -1;
}

/** Number of pixels holding a slot. */
function count(target: DrawTarget, slot: number): number {
  return target.framebuffer.pixels.filter((value) => value === slot).length;
}

/** Draws one widget on a fresh target. */
function drawn(widget: Widget, options: Partial<WidgetDrawOptions> = {}): DrawTarget {
  const target = makeTarget();
  drawWidget(target, widget, { ...NORMAL, ...options });
  return target;
}

test('buttons: primary ink fill with a +2/+2 shadow, secondary paper fill', () => {
  const rect = { x: 10, y: 10, width: 40, height: 16 };
  const primary = drawn({ ...makeButton('a', rect), variant: 'primary', icon: 'play' });
  expect(at(primary, 12, 11)).toBe(UI_THEME.buttonFill);
  expect(at(primary, 51, 20)).toBe(UI_THEME.panelShadow);
  expect(count(primary, UI_THEME.buttonText)).toBeGreaterThan(0);
  const secondary = drawn(makeButton('b', rect));
  expect(at(secondary, 12, 11)).toBe(UI_THEME.panelFill);
  expect(at(secondary, 10, 10)).toBe(UI_THEME.panelBorder);
});

test('pressed buttons lose the shadow and take the selected roles', () => {
  const rect = { x: 10, y: 10, width: 40, height: 16 };
  const target = drawn(makeButton('a', rect), { isPressed: true });
  expect(at(target, 51, 20)).toBe(SLOT.paper);
  expect(at(target, 10, 10)).toBe(UI_THEME.selectedBorder);
  expect(at(target, 11, 11)).toBe(UI_THEME.selectedFill);
});

test('disabled buttons use the disabled roles and no shadow; icon buttons show their glyph', () => {
  const rect = { x: 10, y: 10, width: 20, height: 20 };
  const disabled = drawn({ ...makeButton('a', rect), isDisabled: true });
  expect(at(disabled, 10, 10)).toBe(UI_THEME.disabledBorder);
  expect(count(disabled, UI_THEME.panelShadow)).toBe(0);
  const icon = drawn({ ...makeButton('g', rect), variant: 'icon', icon: 'gear' });
  expect(count(icon, UI_THEME.text)).toBeGreaterThan(20);
});

test('the focus ring is drawn only when focused and rings are shown', () => {
  const rect = { x: 10, y: 10, width: 40, height: 16 };
  expect(
    count(drawn(makeButton('a', rect), { isFocused: true }), UI_THEME.focusRing),
  ).toBeGreaterThan(0);
  expect(
    count(
      drawn(makeButton('a', rect), { isFocused: true, hasFocusRing: false }),
      UI_THEME.focusRing,
    ),
  ).toBe(0);
});

test('toggle on is an ink box, off a paper box', () => {
  const on = drawn({ ...makeToggle('t'), isOn: true });
  const off = drawn(makeToggle('t'));
  expect(count(on, UI_THEME.buttonFill)).toBeGreaterThan(count(off, UI_THEME.buttonFill));
  expect(count(drawn(makeToggle('t'), { isPressed: true }), UI_THEME.selectedFill)).toBeGreaterThan(
    0,
  );
});

test('slider draws the blue filled part, the thumb and the value', () => {
  const target = drawn(makeSlider('s'));
  expect(count(target, UI_THEME.accent)).toBeGreaterThan(10);
  expect(count(target, UI_THEME.textAccent)).toBeGreaterThan(0);
  expect(
    count(drawn(makeSlider('s'), { isPressed: true }), UI_THEME.selectedBorder),
  ).toBeGreaterThan(0);
  expect(count(drawn({ ...makeSlider('s'), isDisabled: true }), UI_THEME.accent)).toBe(0);
});

test('selector, initials and every disabled kind draw without errors', () => {
  expect(count(drawn(makeSelector('s')), UI_THEME.textAccent)).toBeGreaterThan(0);
  expect(
    count(drawn(makeSelector('s'), { isPressed: true }), UI_THEME.selectedBorder),
  ).toBeGreaterThan(0);
  const initials = drawn(makeInitials('i'), { isFocused: true });
  expect(count(initials, UI_THEME.selectedFill)).toBeGreaterThan(0);
  expect(count(initials, UI_THEME.focusRing)).toBeGreaterThan(0);
  expect(
    count(drawn(makeInitials('i'), { isPressed: true }), UI_THEME.panelShadow),
  ).toBeGreaterThan(0);
  for (const widget of [makeSelector('s'), makeInitials('i'), makeToggle('t')]) {
    expect(count(drawn({ ...widget, isDisabled: true }), UI_THEME.disabledText)).toBeGreaterThan(0);
  }
});

test('a dialog centres in its region and draws its panel, texts and buttons', () => {
  const region = { x: 0, y: 0, width: 200, height: 120 };
  const buttons = [makeButton('quit'), makeButton('stay')];
  const model = layoutDialog(
    region,
    { title: 'Quit?', message: 'The round ends.', buttons },
    { text: TEXT, minTouchTarget: 14 },
  );
  const [first, second] = model.buttons;
  expect(first?.rect.y).toBe(second?.rect.y);
  expect((first?.rect.x ?? 0) + (first?.rect.width ?? 0)).toBeLessThan(second?.rect.x ?? 0);
  const target = makeTarget();
  drawDialog(target, model, NORMAL);
  expect(count(target, UI_THEME.panelShadow)).toBeGreaterThan(0);
  expect(count(target, UI_THEME.textAccent)).toBeGreaterThan(0);
  const empty = makeTarget();
  drawDialog(empty, { title: 'x', message: '', buttons: [] }, NORMAL);
  expect(count(empty, SLOT.paper)).toBe(200 * 120);
});

test('dialog buttons stack when they do not fit side by side', () => {
  const region = { x: 0, y: 0, width: 90, height: 200 };
  const buttons = [
    { ...makeButton('a'), label: 'Back to the hub' },
    { ...makeButton('b'), label: 'Play again' },
  ];
  const model = layoutDialog(
    region,
    { title: '', message: 'A long message that has to wrap.', buttons },
    { text: TEXT, minTouchTarget: 36 },
  );
  const [first, second] = model.buttons;
  expect(first?.rect.x).toBe(second?.rect.x);
  expect((second?.rect.y ?? 0) - (first?.rect.y ?? 0)).toBeGreaterThanOrEqual(36);
});
