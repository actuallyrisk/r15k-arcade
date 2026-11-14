import type { OperatingSystem } from '../platform/platform-types.ts';
import type { InputDevice } from './actions.ts';

/** 'touch' on Android, iOS or a coarse primary pointer; else 'keyboard'. */
export function detectInitialDevice(window: Window, os: OperatingSystem): InputDevice {
  if (os === 'android' || os === 'ios') {
    return 'touch';
  }
  return window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard';
}
