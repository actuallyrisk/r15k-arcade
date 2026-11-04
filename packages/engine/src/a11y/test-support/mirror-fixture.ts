// A mirror inside a fresh #a11y-root of the test document, with a recorded event list and a mapper
// that turns logical rects into CSS rects at k = 1.5 plus a canvas offset, plus nodes of every kind.
import { vi } from 'vitest';
import type { Mock } from 'vitest';
import type { Rect } from '../../math/geometry.ts';
import { A11yMirror } from '../a11y-mirror.ts';
import type { A11yEvent, A11yNode, A11yTree } from '../a11y-types.ts';

/** Logical → CSS at 1.5 CSS px per logical px, canvas at (10, 20). */
export const TO_CSS = (rect: Rect): Rect => ({
  x: 10 + rect.x * 1.5,
  y: 20 + rect.y * 1.5,
  width: rect.width * 1.5,
  height: rect.height * 1.5,
});

/** A mirror under test. */
export interface MirrorFixture {
  readonly mirror: A11yMirror;
  readonly root: HTMLElement;
  readonly onEvent: Mock<(event: A11yEvent) => void>;
  /** The mirror element of a node id. */
  readonly element: (id: string) => HTMLElement | null;
}

/** Creates a mirror in a new root appended to the body. */
export function createMirrorFixture(): MirrorFixture {
  const root = document.createElement('div');
  root.id = 'a11y-root';
  document.body.replaceChildren(root);
  const onEvent = vi.fn<(event: A11yEvent) => void>();
  const mirror = new A11yMirror({ root, document, toCss: TO_CSS, onEvent });
  return {
    mirror,
    root,
    onEvent,
    element: (id) => root.querySelector<HTMLElement>(`[data-a11y-id="${id}"]`),
  };
}

const RECT: Rect = { x: 4, y: 8, width: 32, height: 16 };

/** One node of every kind, in menu order. */
export const ALL_KINDS: readonly A11yNode[] = [
  { kind: 'heading', id: 'title', rect: RECT, label: 'Settings', level: 2 },
  { kind: 'text', id: 'hint', rect: RECT, label: 'Press Enter', description: 'Hint' },
  { kind: 'button', id: 'back', rect: RECT, label: 'Back', isDisabled: false },
  { kind: 'switch', id: 'mute', rect: RECT, label: 'Mute', isOn: true, isDisabled: false },
  {
    kind: 'slider',
    id: 'music',
    rect: RECT,
    label: 'Music',
    value: 70,
    min: 0,
    max: 100,
    step: 10,
    valueText: '70 %',
    isDisabled: false,
  },
  {
    kind: 'select',
    id: 'language',
    rect: RECT,
    label: 'Language',
    options: [
      { id: 'system', label: 'System' },
      { id: 'de', label: 'Deutsch' },
      { id: 'en', label: 'English' },
    ],
    selectedId: 'de',
    isDisabled: false,
  },
  {
    kind: 'list',
    id: 'scores',
    rect: RECT,
    label: 'Top 10',
    items: [
      { id: 'r1', label: '1. R15 120' },
      { id: 'r2', label: '2. ABC 90' },
    ],
  },
];

/** A tree of the given nodes. */
export function treeOf(nodes: readonly A11yNode[], focusId?: string): A11yTree {
  return { title: 'R15K Arcade – Settings', nodes, focusId };
}
