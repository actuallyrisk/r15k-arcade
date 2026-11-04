// @vitest-environment happy-dom
import { expect, test } from 'vitest';
import type { A11yNode } from './a11y-types.ts';
import { ALL_KINDS, createMirrorFixture, treeOf } from './test-support/mirror-fixture.ts';

/** The node of ALL_KINDS with this id, changed by `change`. */
function changed(id: string, change: Partial<A11yNode>): A11yNode {
  const node = ALL_KINDS.find((candidate) => candidate.id === id);
  if (node === undefined) {
    throw new Error(`no node '${id}'`);
  }
  return { ...node, ...change } as A11yNode;
}

/** Tag, class and the given attributes of every child of `parent`. */
function describeChildren(parent: Element, attributes: readonly string[]): readonly unknown[] {
  return Array.from(parent.children, (child) => [
    child.tagName,
    child.className,
    ...attributes.map((name) => child.getAttribute(name)),
  ]);
}

test('the mirror builds the landmark, the title and both live regions', () => {
  const { root } = createMirrorFixture();
  expect(describeChildren(root, ['role', 'aria-live', 'aria-atomic', 'aria-label'])).toEqual([
    ['MAIN', 'a11y-main', null, null, null, 'R15K Arcade'],
    ['DIV', 'a11y-live', 'status', 'polite', 'true', null],
    ['DIV', 'a11y-alert', 'alert', 'assertive', 'true', null],
  ]);
  expect(root.querySelector('main > h1')?.className).toBe('a11y-title');
});

test('sync creates one real element per node kind, in tree order after the title', () => {
  const { mirror, root } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS));
  const main = root.querySelector('main');
  expect(main?.querySelector('h1')?.textContent).toBe('R15K Arcade – Settings');
  const elements = Array.from(main?.children ?? []).slice(1);
  expect(
    elements.map((element) => [element.tagName, element.getAttribute('data-a11y-id')]),
  ).toEqual([
    ['H2', 'title'],
    ['P', 'hint'],
    ['BUTTON', 'back'],
    ['BUTTON', 'mute'],
    ['INPUT', 'music'],
    ['SELECT', 'language'],
    ['UL', 'scores'],
  ]);
});

test('labels, states and descriptions are written to the elements', () => {
  const { mirror, element } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS));
  expect(element('title')?.textContent).toBe('Settings');
  expect(element('hint')?.getAttribute('aria-description')).toBe('Hint');
  expect([element('back')?.textContent, element('back')?.getAttribute('type')]).toEqual([
    'Back',
    'button',
  ]);
  const mute = element('mute');
  expect([mute?.getAttribute('role'), mute?.getAttribute('aria-checked')]).toEqual([
    'switch',
    'true',
  ]);
  const music = element('music') as HTMLInputElement;
  expect([music.type, music.min, music.max, music.step, music.value]).toEqual([
    'range',
    '0',
    '100',
    '10',
    '70',
  ]);
  expect([music.getAttribute('aria-label'), music.getAttribute('aria-valuetext')]).toEqual([
    'Music',
    '70 %',
  ]);
  const language = element('language') as HTMLSelectElement;
  expect(Array.from(language.options, (option) => [option.value, option.textContent])).toEqual([
    ['system', 'System'],
    ['de', 'Deutsch'],
    ['en', 'English'],
  ]);
  expect([language.value, language.getAttribute('aria-label')]).toEqual(['de', 'Language']);
  const scores = element('scores');
  expect(Array.from(scores?.children ?? [], (item) => item.textContent)).toEqual([
    '1. R15 120',
    '2. ABC 90',
  ]);
  expect(scores?.getAttribute('aria-label')).toBe('Top 10');
});

test('every element sits exactly at toCss(node.rect)', () => {
  const { mirror, element } = createMirrorFixture();
  mirror.sync(treeOf([changed('back', { rect: { x: 3, y: 5, width: 31, height: 30 } })]));
  const { style } = element('back') ?? document.createElement('div');
  expect([style.left, style.top, style.width, style.height]).toEqual([
    '14.5px',
    '27.5px',
    '46.5px',
    '45px',
  ]);
});

test('a node scrolled out to the region edge keeps its full size; a degenerate rect grows to 1 px', () => {
  const { mirror, element } = createMirrorFixture();
  mirror.sync(
    treeOf([
      changed('back', { rect: { x: 0, y: 290, width: 40, height: 30 } }),
      changed('hint', { rect: { x: 2, y: 2, width: 0, height: 0 } }),
    ]),
  );
  expect(element('back')?.style.height).toBe('45px');
  expect([element('hint')?.style.width, element('hint')?.style.height]).toEqual(['1px', '1px']);
});

test('a sync keeps elements by id, updates changed state and removes nodes that left', () => {
  const { mirror, element } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS));
  const back = element('back');
  const music = element('music');
  mirror.sync(
    treeOf([
      changed('music', { value: 30, valueText: '30 %', isDisabled: true }),
      changed('back', { label: 'Zurück', isDisabled: true }),
      changed('mute', { isOn: false }),
    ]),
  );
  expect(element('back')).toBe(back);
  expect(element('music')).toBe(music);
  expect([back?.textContent, (back as HTMLButtonElement).disabled]).toEqual(['Zurück', true]);
  expect([(music as HTMLInputElement).value, (music as HTMLInputElement).disabled]).toEqual([
    '30',
    true,
  ]);
  expect(element('mute')?.getAttribute('aria-checked')).toBe('false');
  expect(element('title')).toBeNull();
  const order = Array.from(document.querySelectorAll('[data-a11y-id]'), (node) =>
    node.getAttribute('data-a11y-id'),
  );
  expect(order).toEqual(['music', 'back', 'mute']);
});

test('a node that changes its kind or heading level gets a new element', () => {
  const { mirror, element } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS));
  const back = element('back');
  mirror.sync(
    treeOf([
      {
        kind: 'switch',
        id: 'back',
        rect: { x: 0, y: 0, width: 9, height: 9 },
        label: 'Back',
        isOn: false,
        isDisabled: false,
      },
      changed('title', { level: 1 }),
    ]),
  );
  expect(element('back')).not.toBe(back);
  expect(element('back')?.getAttribute('role')).toBe('switch');
  expect(element('title')?.tagName).toBe('H1');
  expect(document.querySelectorAll('[data-a11y-id="back"]')).toHaveLength(1);
});

test('options, items and descriptions follow their changes', () => {
  const { mirror, element } = createMirrorFixture();
  mirror.sync(treeOf(ALL_KINDS));
  mirror.sync(
    treeOf([
      changed('language', { options: [{ id: 'en', label: 'English' }], selectedId: 'en' }),
      changed('scores', { items: [{ id: 'r1', label: '1. R15 150' }] }),
      { kind: 'text', id: 'hint', rect: { x: 0, y: 0, width: 9, height: 9 }, label: 'Press Enter' },
    ]),
  );
  const language = element('language') as HTMLSelectElement;
  expect([language.options.length, language.value]).toEqual([1, 'en']);
  expect(element('scores')?.textContent).toBe('1. R15 150');
  expect(element('hint')?.hasAttribute('aria-description')).toBe(false);
});

test('a node id that occurs twice is mirrored once', () => {
  const { mirror } = createMirrorFixture();
  mirror.sync(treeOf([changed('back', {}), changed('back', { label: 'Second' })]));
  const copies = document.querySelectorAll('[data-a11y-id="back"]');
  expect(Array.from(copies, (copy) => copy.textContent)).toEqual(['Back']);
});
