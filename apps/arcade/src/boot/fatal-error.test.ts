// @vitest-environment happy-dom
import { afterEach, expect, test } from 'vitest';
import { setFatalDetails } from './fatal-details.ts';
import { showFatalError } from './fatal-error.ts';

afterEach(() => {
  setFatalDetails(false);
  document.body.innerHTML = '';
});

/** The fatal box of index.html, hidden. */
function addFatalBox(): HTMLElement {
  const box = document.createElement('div');
  box.id = 'fatal';
  box.className = 'fatal';
  box.hidden = true;
  document.body.append(box);
  return box;
}

test('a boot error makes the fatal box visible with the localised message', () => {
  const box = addFatalBox();
  showFatalError(document, new Error('boom'));
  expect(box.hidden).toBe(false);
  expect(box.textContent).toMatch(/R15K Arcade/);
  expect(box.textContent).not.toContain('boom');
  expect(window.getComputedStyle(box).opacity).not.toBe('0');
});

test('development builds append the error message; a missing box is no error', () => {
  const box = addFatalBox();
  setFatalDetails(true);
  showFatalError(document, new Error('boom'));
  expect(box.textContent).toContain('boom');
  box.remove();
  expect(() => {
    showFatalError(document, 'again');
  }).not.toThrow();
});
