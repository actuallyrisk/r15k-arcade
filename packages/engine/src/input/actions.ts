/** Abstract input actions, independent of the device. */
export const ACTIONS = ['left', 'right', 'up', 'down', 'confirm', 'back', 'pause'] as const;

/** One abstract input action. */
export type Action = (typeof ACTIONS)[number];

/** Input device that last produced input (drives button prompts and the focus ring). */
export type InputDevice = 'keyboard' | 'mouse' | 'touch' | 'gamepad';

/** Pointer type of a pointer event. */
export type PointerKind = 'mouse' | 'touch' | 'pen';

/** Global shortcuts handled by the app. */
export type Shortcut = 'toggle-fullscreen';
