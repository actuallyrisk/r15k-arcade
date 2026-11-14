// Mirror element of a selector node: an adjustable `role="spinbutton"` instead of a native <select>.
// A <select> carries a user-agent stylesheet that WebKit refuses under the app's `style-src 'self'`
// CSP; an ARIA element has none. Assistive technology adjusts a spinbutton by dispatching synthetic
// (untrusted) arrow key events, so only untrusted keys step the value here: real keystrokes stay with
// the input manager, which already moves the pixel selector, and are never handled twice.
import { setAttributeValue } from './a11y-attributes.ts';
import type { A11ySelect } from './a11y-types.ts';

/** How a key moves through the options. */
type OptionStep = 'next' | 'previous' | 'first' | 'last';

/** Keys a spinbutton understands: up/right is next, down/left previous, Home/End the ends. */
const STEP_BY_KEY: Readonly<Partial<Record<string, OptionStep>>> = {
  ArrowUp: 'next',
  ArrowRight: 'next',
  ArrowDown: 'previous',
  ArrowLeft: 'previous',
  Home: 'first',
  End: 'last',
};

/** The option index after a step; next and previous wrap like the pixel selector. */
export function stepOptionIndex(step: OptionStep, index: number, count: number): number {
  const from = Math.max(index, 0);
  switch (step) {
    case 'next':
      return (from + 1) % count;
    case 'previous':
      return (from - 1 + count) % count;
    case 'first':
      return 0;
    case 'last':
      return count - 1;
  }
}

/** A spinbutton mirroring one selector node. */
export interface Spinbutton {
  readonly element: HTMLElement;
  /** Writes label, range, value and disabled state. */
  readonly update: (node: A11ySelect) => void;
  /** The id of the current option ('' before the first update). */
  readonly value: () => string;
  /** The option id a key moves to; undefined for other keys, while disabled or without options. */
  readonly optionForKey: (key: string) => string | undefined;
}

/** Writes the ARIA state of a selector node (option indices as the numeric range). */
function writeState(element: HTMLElement, node: A11ySelect): void {
  const index = node.options.findIndex((option) => option.id === node.selectedId);
  const selected = node.options[index];
  setAttributeValue(element, 'aria-label', node.label);
  setAttributeValue(element, 'aria-valuemin', '0');
  setAttributeValue(element, 'aria-valuemax', String(Math.max(node.options.length - 1, 0)));
  setAttributeValue(element, 'aria-valuenow', index < 0 ? undefined : String(index));
  setAttributeValue(element, 'aria-valuetext', selected?.label);
  setAttributeValue(element, 'aria-disabled', node.isDisabled ? 'true' : undefined);
  setAttributeValue(element, 'tabindex', node.isDisabled ? '-1' : '0');
  setAttributeValue(element, 'data-option-id', node.selectedId);
}

/** Creates the spinbutton of a selector (not yet in the document and without its state). */
export function createSpinbutton(document: Document): Spinbutton {
  const element = document.createElement('div');
  element.setAttribute('role', 'spinbutton');
  let current: A11ySelect | undefined;
  return {
    element,
    update: (node) => {
      current = node;
      writeState(element, node);
    },
    value: () => current?.selectedId ?? '',
    optionForKey: (key) => {
      const step = STEP_BY_KEY[key];
      if (step === undefined || current === undefined || current.isDisabled) {
        return undefined;
      }
      const { options, selectedId } = current;
      const index = options.findIndex((option) => option.id === selectedId);
      return options.length === 0
        ? undefined
        : options[stepOptionIndex(step, index, options.length)]?.id;
    },
  };
}
