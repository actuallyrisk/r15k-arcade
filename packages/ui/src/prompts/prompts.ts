import type { InputDevice } from '@r15k/engine';
import { ICONS } from '../text/icons.ts';

/** Glyphs for confirm, back and pause on each device. */
const PROMPTS: Readonly<
  Record<InputDevice, Readonly<Record<'confirm' | 'back' | 'pause', string>>>
> = {
  keyboard: { confirm: ICONS['key-enter'], back: ICONS['key-escape'], pause: 'P' },
  gamepad: { confirm: ICONS['button-a'], back: ICONS['button-b'], pause: ICONS['button-start'] },
  touch: { confirm: ICONS.touch, back: ICONS.back, pause: ICONS.pause },
  mouse: { confirm: ICONS.mouse, back: ICONS.back, pause: ICONS.pause },
};

/**
 * The glyph that prompts an action on the last used device: keyboard Enter / Esc / 'P', gamepad
 * A / B / Start, touch and mouse their pointer icon / back / pause.
 */
export function promptGlyph(action: 'confirm' | 'back' | 'pause', device: InputDevice): string {
  return PROMPTS[device][action];
}

/** Whether the focus ring is shown (keyboard and gamepad; pointers never show it). */
export function shouldShowFocusRing(device: InputDevice): boolean {
  return device === 'keyboard' || device === 'gamepad';
}
