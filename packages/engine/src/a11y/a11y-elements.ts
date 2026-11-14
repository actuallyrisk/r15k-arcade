// DOM elements of the accessibility mirror: one real element per node kind (heading, paragraph,
// button, switch, range input, spinbutton, list). Every write first compares with the DOM, so a sync
// that changes nothing touches nothing, and assistive technology is not told about unchanged state.
import type { Rect } from '../math/geometry.ts';
import { setAttributeValue } from './a11y-attributes.ts';
import { createSpinbutton } from './a11y-spinbutton.ts';
import type { A11yButton, A11yNode, A11ySlider, A11ySwitch } from './a11y-types.ts';

/** The element of one node and how to bring it up to date. */
export interface MirrorEntry {
  readonly kind: A11yNode['kind'];
  /** Kind plus heading level: a node whose shape changes gets a new element. */
  readonly shape: string;
  readonly element: HTMLElement;
  /** Writes the kind-specific label and state of a node of the same shape. */
  readonly update: (node: A11yNode) => void;
  /** The control's current value (range input value, spinbutton option id; '' for other kinds). */
  readonly value: () => string;
  /** The option id an adjusting key moves a spinbutton to; undefined for every other kind. */
  readonly optionForKey: (key: string) => string | undefined;
}

/** The value of an element that has none (only range inputs and spinbuttons have one). */
const noValue = (): string => '';

/** Keys adjust nothing on elements other than spinbuttons. */
const noOption = (): undefined => undefined;

/** The shape of a node (headings differ by level, because the tag does). */
export function shapeOf(node: A11yNode): string {
  return node.kind === 'heading' ? `heading-${node.level}` : node.kind;
}

/** Sets the text unless it is already there. */
function setText(element: HTMLElement, text: string): void {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

/** Disables a control unless it already is in that state. */
function setDisabled(element: HTMLButtonElement | HTMLInputElement, isDisabled: boolean): void {
  if (element.disabled !== isDisabled) {
    element.disabled = isDisabled;
  }
}

/** Places an element at a CSS rect (never smaller than 1×1 CSS px, so screen readers keep it). */
export function placeElement(element: HTMLElement, rect: Rect): void {
  const { style } = element;
  const values: readonly [
    keyof Pick<CSSStyleDeclaration, 'left' | 'top' | 'width' | 'height'>,
    number,
  ][] = [
    ['left', rect.x],
    ['top', rect.y],
    ['width', Math.max(rect.width, 1)],
    ['height', Math.max(rect.height, 1)],
  ];
  for (const [property, value] of values) {
    const css = `${value}px`;
    if (style[property] !== css) {
      style[property] = css;
    }
  }
}

/** Rebuilds the children of a list when their ids or labels changed. */
function syncChildren(
  parent: HTMLElement,
  items: readonly { readonly id: string; readonly label: string }[],
  create: (item: { readonly id: string; readonly label: string }) => HTMLElement,
): void {
  const current = Array.from(parent.children, (child) => [
    child.getAttribute('data-item-id'),
    child.textContent,
  ]);
  const isSame =
    current.length === items.length &&
    items.every((item, index) => {
      const child = current[index];
      return child?.[0] === item.id && child[1] === item.label;
    });
  if (!isSame) {
    parent.replaceChildren(
      ...items.map((item) => {
        const child = create(item);
        child.setAttribute('data-item-id', item.id);
        child.textContent = item.label;
        return child;
      }),
    );
  }
}

/** An element whose text is its label (heading or paragraph). */
function textEntry(document: Document, node: A11yNode, tag: 'h1' | 'h2' | 'p'): MirrorEntry {
  const element = document.createElement(tag);
  return {
    kind: node.kind,
    shape: shapeOf(node),
    element,
    update: (next) => {
      setText(element, next.label);
    },
    value: noValue,
    optionForKey: noOption,
  };
}

/** A button, or a button with the switch role. */
function buttonEntry(document: Document, node: A11yButton | A11ySwitch): MirrorEntry {
  const button = document.createElement('button');
  button.type = 'button';
  if (node.kind === 'switch') {
    button.setAttribute('role', 'switch');
  }
  return {
    kind: node.kind,
    shape: shapeOf(node),
    element: button,
    update: (next) => {
      setText(button, next.label);
      if (next.kind === 'button' || next.kind === 'switch') {
        setDisabled(button, next.isDisabled);
        setAttributeValue(
          button,
          'aria-checked',
          next.kind === 'switch' ? String(next.isOn) : undefined,
        );
      }
    },
    value: noValue,
    optionForKey: noOption,
  };
}

/** Writes a slider's range before its value, because the input clamps the value to the range. */
function updateSlider(input: HTMLInputElement, node: A11ySlider): void {
  setAttributeValue(input, 'aria-label', node.label);
  for (const [name, value] of [
    ['min', node.min],
    ['max', node.max],
    ['step', node.step],
  ] as const) {
    setAttributeValue(input, name, String(value));
  }
  if (input.value !== String(node.value)) {
    input.value = String(node.value);
  }
  setAttributeValue(input, 'aria-valuetext', node.valueText);
  setDisabled(input, node.isDisabled);
}

/** A range input. */
function sliderEntry(document: Document): MirrorEntry {
  const input = document.createElement('input');
  input.type = 'range';
  return {
    kind: 'slider',
    shape: 'slider',
    element: input,
    update: (next) => {
      if (next.kind === 'slider') {
        updateSlider(input, next);
      }
    },
    value: () => input.value,
    optionForKey: noOption,
  };
}

/** A spinbutton (a native select would need a user-agent stylesheet that strict CSP refuses). */
function selectEntry(document: Document): MirrorEntry {
  const spinbutton = createSpinbutton(document);
  return {
    kind: 'select',
    shape: 'select',
    element: spinbutton.element,
    update: (next) => {
      if (next.kind === 'select') {
        spinbutton.update(next);
      }
    },
    value: spinbutton.value,
    optionForKey: spinbutton.optionForKey,
  };
}

/** An unordered list with one item per entry. */
function listEntry(document: Document): MirrorEntry {
  const list = document.createElement('ul');
  return {
    kind: 'list',
    shape: 'list',
    element: list,
    update: (next) => {
      setAttributeValue(list, 'aria-label', next.label);
      if (next.kind === 'list') {
        syncChildren(list, next.items, () => document.createElement('li'));
      }
    },
    value: noValue,
    optionForKey: noOption,
  };
}

/** Creates the element of a node (not yet in the document and without its state). */
export function createMirrorEntry(document: Document, node: A11yNode): MirrorEntry {
  switch (node.kind) {
    case 'heading':
      return textEntry(document, node, node.level === 1 ? 'h1' : 'h2');
    case 'text':
      return textEntry(document, node, 'p');
    case 'button':
    case 'switch':
      return buttonEntry(document, node);
    case 'slider':
      return sliderEntry(document);
    case 'select':
      return selectEntry(document);
    case 'list':
      return listEntry(document);
  }
}
