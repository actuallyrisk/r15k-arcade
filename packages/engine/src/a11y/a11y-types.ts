import type { Rect } from '../math/geometry.ts';

/** Members of every mirror node; `rect` is in logical px. */
interface A11yBase {
  readonly id: string;
  readonly rect: Rect;
  readonly label: string;
  readonly description?: string;
}

/** A heading. */
export interface A11yHeading extends A11yBase {
  readonly kind: 'heading';
  readonly level: 1 | 2;
}

/** A paragraph of text. */
export interface A11yText extends A11yBase {
  readonly kind: 'text';
}

/** A button. */
export interface A11yButton extends A11yBase {
  readonly kind: 'button';
  readonly isDisabled: boolean;
}

/** An on/off switch. */
export interface A11ySwitch extends A11yBase {
  readonly kind: 'switch';
  readonly isOn: boolean;
  readonly isDisabled: boolean;
}

/** A range slider. */
export interface A11ySlider extends A11yBase {
  readonly kind: 'slider';
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly valueText: string;
  readonly isDisabled: boolean;
}

/** A selection from a list of options. */
export interface A11ySelect extends A11yBase {
  readonly kind: 'select';
  readonly options: readonly { readonly id: string; readonly label: string }[];
  readonly selectedId: string;
  readonly isDisabled: boolean;
}

/** A list of items. */
export interface A11yList extends A11yBase {
  readonly kind: 'list';
  readonly items: readonly { readonly id: string; readonly label: string }[];
}

/** One node of the accessibility mirror. */
export type A11yNode =
  A11yHeading | A11yText | A11yButton | A11ySwitch | A11ySlider | A11ySelect | A11yList;

/** What a scene exposes to assistive technology. */
export interface A11yTree {
  readonly title: string;
  readonly nodes: readonly A11yNode[];
  readonly focusId: string | undefined;
}

/** A tree without nodes. */
export const EMPTY_A11Y_TREE: A11yTree = { title: '', nodes: [], focusId: undefined };

/** Assistive technology activated a node. */
interface A11yActivateEvent {
  readonly kind: 'activate';
  readonly id: string;
}

/** DOM focus moved to a node. */
interface A11yFocusEvent {
  readonly kind: 'focus';
  readonly id: string;
}

/** A slider value changed. */
interface A11yValueEvent {
  readonly kind: 'value';
  readonly id: string;
  readonly value: number;
}

/** A select option was chosen. */
interface A11ySelectEvent {
  readonly kind: 'select';
  readonly id: string;
  readonly optionId: string;
}

/** An event from the mirror layer, delivered to the top scene in the next frame. */
export type A11yEvent = A11yActivateEvent | A11yFocusEvent | A11yValueEvent | A11ySelectEvent;
