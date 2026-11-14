import type { DrawTarget, Rect } from '@r15k/engine';
import { drawLabel } from '../draw/label.ts';
import { capHeightOf } from '../text/text-metrics.ts';
import { UI_THEME } from '../theme/ui-theme.ts';
import {
  ALPHABET,
  boxPadding,
  LETTER_COUNT,
  letterBoxes,
  letterStyle,
  withLetter,
} from './initials-layout.ts';
import { boxLook, drawBox, drawFocusIfShown } from './widget-look.ts';
import type { InitialsWidget, WidgetDrawOptions, WidgetIntent } from './widget-types.ts';

/** Characters an initial can take, in the order up/down steps through them. */
export const INITIALS_ALPHABET = ALPHABET;

/** Number of initials. */
export const INITIALS_LENGTH = LETTER_COUNT;

/** One box with its letter; the cursor box also gets ↑ and ↓ in its upper and lower half. */
function drawLetterBox(
  target: DrawTarget,
  widget: InitialsWidget,
  context: { readonly box: Rect; readonly index: number; readonly options: WidgetDrawOptions },
): void {
  const { box, index, options } = context;
  const isCursor = index === widget.cursor && !widget.isDisabled;
  const look = boxLook(isCursor ? 'selected' : 'secondary', {
    isPressed: isCursor && options.isPressed,
    isDisabled: widget.isDisabled,
  });
  drawBox(target, box, look);
  const letters = letterStyle(options.text);
  const centreX = box.x + Math.floor(box.width / 2) + look.shift;
  drawLabel(target, widget.letters.charAt(index), {
    style: letters,
    slot: look.text,
    x: centreX,
    y: box.y + Math.floor((box.height - capHeightOf(letters)) / 2) + look.shift,
    align: 'center',
  });
  if (isCursor) {
    const padding = boxPadding(options.text);
    const arrow = {
      style: options.text,
      slot: UI_THEME.selectedBorder,
      x: centreX,
      align: 'center',
    } as const;
    drawLabel(target, '↑', { ...arrow, y: box.y + padding + look.shift });
    const downY = box.y + box.height - padding - capHeightOf(options.text) + look.shift;
    drawLabel(target, '↓', { ...arrow, y: downY });
  }
}

/**
 * Draws the three letter boxes (letters in menu text × 2), the cursor box in the selected look with
 * ↑/↓ in its upper and lower half, and the focus ring around the widget.
 */
export function drawInitials(
  target: DrawTarget,
  widget: InitialsWidget,
  options: WidgetDrawOptions,
): void {
  letterBoxes(widget.rect).forEach((box, index) => {
    drawLetterBox(target, widget, { box, index, options });
  });
  drawFocusIfShown(target, widget.rect, options);
}

/** The alphabet index of the letter at `index` (−1 when it is not in the alphabet). */
function letterIndex(widget: InitialsWidget, index: number): number {
  return ALPHABET.indexOf(widget.letters.charAt(index));
}

/** The cursor clamped to the letter range. */
function clampCursor(cursor: number): number {
  return Math.min(LETTER_COUNT - 1, Math.max(0, cursor));
}

/** An initials intent for new letters and cursor. */
function intent(
  widget: InitialsWidget,
  change: { readonly letters?: string; readonly cursor?: number; readonly isComplete?: boolean },
): WidgetIntent {
  return {
    kind: 'initials',
    id: widget.id,
    letters: change.letters ?? widget.letters,
    cursor: change.cursor ?? widget.cursor,
    isComplete: change.isComplete ?? false,
  };
}

/** The letter at the cursor moved by `delta` through the alphabet (wraps). */
function stepLetter(widget: InitialsWidget, delta: 1 | -1): WidgetIntent {
  const cursor = clampCursor(widget.cursor);
  const current = Math.max(0, letterIndex(widget, cursor));
  const next = (current + delta + ALPHABET.length) % ALPHABET.length;
  return intent(widget, { letters: withLetter(widget.letters, cursor, ALPHABET.charAt(next)) });
}

/**
 * Applies a navigation action to the focused initials: up/down letter −1/+1 (wraps), left/right cursor
 * −1/+1 (clamped), confirm cursor +1 and at the last letter `isComplete: true`. `back` is handled by the
 * menu reducer.
 */
export function stepInitials(
  widget: InitialsWidget,
  action: 'up' | 'down' | 'left' | 'right' | 'confirm',
): WidgetIntent {
  switch (action) {
    case 'up':
      return stepLetter(widget, -1);
    case 'down':
      return stepLetter(widget, 1);
    case 'left':
      return intent(widget, { cursor: clampCursor(widget.cursor - 1) });
    case 'right':
      return intent(widget, { cursor: clampCursor(widget.cursor + 1) });
    case 'confirm':
      return widget.cursor >= LETTER_COUNT - 1
        ? intent(widget, { cursor: LETTER_COUNT - 1, isComplete: true })
        : intent(widget, { cursor: clampCursor(widget.cursor + 1) });
  }
}

/**
 * Sets the letter at the cursor and moves the cursor one box right (clamped). Characters outside
 * INITIALS_ALPHABET (after upper-casing) leave the widget unchanged.
 */
export function typeInitial(widget: InitialsWidget, char: string): WidgetIntent {
  const letter = char.toUpperCase();
  if (letter.length !== 1 || !ALPHABET.includes(letter)) {
    return intent(widget, {});
  }
  const cursor = clampCursor(widget.cursor);
  return intent(widget, {
    letters: withLetter(widget.letters, cursor, letter),
    cursor: clampCursor(cursor + 1),
  });
}
