import { notImplemented } from '@r15k/engine';
import type { InputDevice } from '@r15k/engine';

/** The glyph that prompts an action on the last used device. */
export function promptGlyph(_action: 'confirm' | 'back' | 'pause', _device: InputDevice): string {
  return notImplemented('ui.promptGlyph');
}

/** Whether the focus ring is shown (keyboard and gamepad). */
export function shouldShowFocusRing(_device: InputDevice): boolean {
  return notImplemented('ui.shouldShowFocusRing');
}
