import type { Rect, TextChoice } from '@r15k/engine';
import type { IconName } from '../text/icons.ts';

/** State the draw functions need beyond the widget itself. */
export interface WidgetDrawOptions {
  readonly text: TextChoice;
  readonly isFocused: boolean;
  readonly hasFocusRing: boolean;
  readonly isPressed: boolean;
}

/** Members of every widget. */
interface WidgetBase {
  readonly id: string;
  readonly rect: Rect;
  readonly label: string;
  readonly isDisabled: boolean;
}

/** A push button. */
export interface ButtonWidget extends WidgetBase {
  readonly kind: 'button';
  readonly variant: 'primary' | 'secondary' | 'icon';
  readonly icon: IconName | undefined;
}

/** An on/off row. */
export interface ToggleWidget extends WidgetBase {
  readonly kind: 'toggle';
  readonly isOn: boolean;
  readonly onText: string;
  readonly offText: string;
}

/** A stepped value row. */
export interface SliderWidget extends WidgetBase {
  readonly kind: 'slider';
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly valueText: string;
}

/** One option of a selector. */
export interface SelectorOption {
  readonly id: string;
  readonly label: string;
}

/** A `← value →` row. */
export interface SelectorWidget extends WidgetBase {
  readonly kind: 'selector';
  readonly options: readonly SelectorOption[];
  readonly selectedId: string;
}

/** Three-letter initials entry. */
export interface InitialsWidget extends WidgetBase {
  readonly kind: 'initials';
  readonly letters: string;
  readonly cursor: number;
}

/** Every widget kind. */
export type Widget = ButtonWidget | ToggleWidget | SliderWidget | SelectorWidget | InitialsWidget;

/** What a widget interaction asks the scene to do. */
export type WidgetIntent =
  | { readonly kind: 'activate'; readonly id: string }
  | { readonly kind: 'toggle'; readonly id: string; readonly isOn: boolean }
  | { readonly kind: 'change'; readonly id: string; readonly value: number }
  | { readonly kind: 'select'; readonly id: string; readonly optionId: string }
  | {
      readonly kind: 'initials';
      readonly id: string;
      readonly letters: string;
      readonly cursor: number;
      readonly isComplete: boolean;
    }
  | { readonly kind: 'back' };

/** Menu sounds. */
export type UiSound = 'move' | 'confirm' | 'back';
