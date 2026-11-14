// @vitest-environment happy-dom
import { expect, test } from 'vitest';
import { createSpinbutton, stepOptionIndex } from './a11y-spinbutton.ts';
import type { A11ySelect } from './a11y-types.ts';

const THEME: A11ySelect = {
  kind: 'select',
  id: 'theme',
  rect: { x: 0, y: 0, width: 48, height: 48 },
  label: 'Theme',
  options: [
    { id: 'system', label: 'System' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
  ],
  selectedId: 'dark',
  isDisabled: false,
};

test('next and previous wrap around; first and last go to the ends', () => {
  expect([
    stepOptionIndex('next', 2, 3),
    stepOptionIndex('previous', 0, 3),
    stepOptionIndex('next', 0, 3),
    stepOptionIndex('previous', 2, 3),
    stepOptionIndex('first', 1, 3),
    stepOptionIndex('last', 1, 3),
  ]).toEqual([0, 2, 1, 1, 0, 2]);
});

test('an unknown current option steps from the first one', () => {
  expect([stepOptionIndex('next', -1, 3), stepOptionIndex('previous', -1, 3)]).toEqual([1, 2]);
});

test('a spinbutton maps keys to options from the last written state', () => {
  const spinbutton = createSpinbutton(document);
  expect([spinbutton.value(), spinbutton.optionForKey('ArrowUp')]).toEqual(['', undefined]);
  spinbutton.update(THEME);
  expect(['ArrowUp', 'ArrowLeft', 'Home', 'End', 'Enter'].map(spinbutton.optionForKey)).toEqual([
    'system',
    'light',
    'system',
    'dark',
    undefined,
  ]);
  expect(spinbutton.value()).toBe('dark');
});

test('a disabled spinbutton or one without options ignores keys and leaves the tab order', () => {
  const spinbutton = createSpinbutton(document);
  spinbutton.update({ ...THEME, isDisabled: true });
  const { element } = spinbutton;
  expect(spinbutton.optionForKey('ArrowUp')).toBeUndefined();
  expect([element.getAttribute('aria-disabled'), element.getAttribute('tabindex')]).toEqual([
    'true',
    '-1',
  ]);
  spinbutton.update({ ...THEME, options: [], selectedId: 'none' });
  expect(spinbutton.optionForKey('ArrowUp')).toBeUndefined();
  expect(
    ['aria-valuemax', 'aria-valuenow', 'aria-valuetext', 'aria-disabled'].map((name) =>
      element.getAttribute(name),
    ),
  ).toEqual(['0', null, null, null]);
});
