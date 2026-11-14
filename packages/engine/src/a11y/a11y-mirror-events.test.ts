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

/** Dispatches a bubbling, cancelable keydown and returns it. */
function pressKey(target: Element | null, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target?.dispatchEvent(event);
  return event;
}

test('a range input reports its value; change and plain events on a spinbutton do not', () => {
  const { mirror, element, onEvent } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS));
  const music = element('music') as HTMLInputElement;
  music.value = '40';
  music.dispatchEvent(new Event('input', { bubbles: true }));
  music.dispatchEvent(new Event('change', { bubbles: true }));
  element('language')?.dispatchEvent(new Event('change', { bubbles: true }));
  element('language')?.dispatchEvent(new Event('keydown', { bubbles: true }));
  expect(onEvent.mock.calls).toEqual([[{ kind: 'value', id: 'music', value: 40 }]]);
});

test('synthetic adjusting keys on a spinbutton select the next, previous, first or last option', () => {
  const { mirror, element, onEvent } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS));
  const language = element('language');
  for (const key of ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Home', 'End']) {
    pressKey(language, key);
  }
  expect(onEvent.mock.calls.map(([event]) => event)).toEqual(
    ['en', 'en', 'system', 'system', 'system', 'en'].map((optionId) => ({
      kind: 'select',
      id: 'language',
      optionId,
    })),
  );
});

test('a handled key stays in the mirror; other keys and keys on other nodes pass through', () => {
  const { mirror, element, onEvent } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS));
  const reachedWindow: string[] = [];
  const onWindowKey = (event: KeyboardEvent): void => {
    reachedWindow.push(event.key);
  };
  window.addEventListener('keydown', onWindowKey);
  const handled = pressKey(element('language'), 'ArrowUp');
  const ignored = pressKey(element('language'), 'Enter');
  pressKey(element('back'), 'ArrowUp');
  window.removeEventListener('keydown', onWindowKey);
  expect([handled.defaultPrevented, ignored.defaultPrevented]).toEqual([true, false]);
  expect(reachedWindow).toEqual(['Enter', 'ArrowUp']);
  expect(onEvent).toHaveBeenCalledTimes(1);
});

test('real keystrokes on a spinbutton are left to the input manager', () => {
  const { mirror, element, onEvent } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS));
  const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
  Object.defineProperty(event, 'isTrusted', { value: true });
  element('language')?.dispatchEvent(event);
  expect([event.defaultPrevented, onEvent.mock.calls.length]).toEqual([false, 0]);
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
