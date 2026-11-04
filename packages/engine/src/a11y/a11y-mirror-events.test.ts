// @vitest-environment happy-dom
import { expect, test } from 'vitest';
import { ALL_KINDS, createMirrorFixture, treeOf } from './test-support/mirror-fixture.ts';

test('a changed tree focus moves DOM focus, without reporting it back', () => {
  const { mirror, element, onEvent } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS, 'back'));
  expect(document.activeElement).toBe(element('back'));
  mirror.sync(treeOf(ALL_KINDS, 'music'));
  expect(document.activeElement).toBe(element('music'));
  expect(onEvent).not.toHaveBeenCalled();
});

test('an unchanged tree focus never pulls DOM focus back', () => {
  const { mirror, element } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS, 'back'));
  element('mute')?.focus();
  mirror.sync(treeOf(ALL_KINDS, 'back'));
  expect(document.activeElement).toBe(element('mute'));
});

test('DOM focus becomes a focus event; the tree adopting it moves nothing', () => {
  const { mirror, element, onEvent } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS, 'back'));
  element('language')?.focus();
  expect(onEvent).toHaveBeenCalledWith({ kind: 'focus', id: 'language' });
  mirror.sync(treeOf(ALL_KINDS, 'language'));
  expect(document.activeElement).toBe(element('language'));
  expect(onEvent).toHaveBeenCalledTimes(1);
});

test('clicks on buttons and switches activate; clicks on other nodes do nothing', () => {
  const { mirror, element, onEvent } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS));
  for (const id of ['back', 'mute', 'title', 'hint', 'scores']) {
    element(id)?.click();
  }
  expect(onEvent.mock.calls).toEqual([
    [{ kind: 'activate', id: 'back' }],
    [{ kind: 'activate', id: 'mute' }],
  ]);
});

test('a range input reports its value, a select change its option', () => {
  const { mirror, element, onEvent } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS));
  const music = element('music') as HTMLInputElement;
  music.value = '40';
  music.dispatchEvent(new Event('input', { bubbles: true }));
  music.dispatchEvent(new Event('change', { bubbles: true }));
  const language = element('language') as HTMLSelectElement;
  language.value = 'en';
  language.dispatchEvent(new Event('change', { bubbles: true }));
  language.dispatchEvent(new Event('input', { bubbles: true }));
  expect(onEvent.mock.calls).toEqual([
    [{ kind: 'value', id: 'music', value: 40 }],
    [{ kind: 'select', id: 'language', optionId: 'en' }],
  ]);
});

test('events on mirror parts without a node are ignored', () => {
  const { mirror, root, onEvent } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS));
  root.querySelector('h1')?.dispatchEvent(new Event('click', { bubbles: true }));
  root.querySelector('li')?.dispatchEvent(new Event('click', { bubbles: true }));
  root.querySelector('main')?.dispatchEvent(new Event('focusin'));
  expect(onEvent).not.toHaveBeenCalled();
});

test('a reorder that moves the focused element keeps it focused', () => {
  const { mirror, element } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS, 'back'));
  mirror.sync(treeOf([...ALL_KINDS].reverse(), 'back'));
  expect(document.activeElement).toBe(element('back'));
  expect(element('scores')?.previousElementSibling?.tagName).toBe('H1');
});

test('setLocale sets the document language', () => {
  const { mirror } = createMirrorFixture();
  mirror.setLocale('de');
  expect(document.documentElement.lang).toBe('de');
  mirror.setLocale('en');
  expect(document.documentElement.lang).toBe('en');
});

test('a new layout mapper moves every element at once', () => {
  const { mirror, element } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS));
  mirror.setLayoutMapper((rect) => ({ ...rect, x: rect.x + 100 }));
  expect(element('back')?.style.left).toBe('104px');
  expect(element('back')?.style.width).toBe('32px');
});

test('dispose removes the mirror and stops reporting events', () => {
  const { mirror, root, onEvent } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS));
  const back = root.querySelector<HTMLElement>('[data-a11y-id="back"]');
  mirror.dispose();
  back?.click();
  expect(root.children).toHaveLength(0);
  expect(onEvent).not.toHaveBeenCalled();
  mirror.setLayoutMapper((rect) => rect);
});
