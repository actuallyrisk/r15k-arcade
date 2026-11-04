/**
 * Command names of the app's own Tauri plugin `device` (immersive mode, keep-awake, move to background).
 * The toggles take the argument object `{ enabled: isOn }`; constants only, the invoke lives in the Tauri
 * platform.
 */
export const DEVICE_COMMANDS = {
  setImmersive: 'plugin:device|set_immersive',
  setKeepAwake: 'plugin:device|set_keep_awake',
  moveToBackground: 'plugin:device|move_to_background',
} as const;
