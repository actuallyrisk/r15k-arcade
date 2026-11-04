import type { OperatingSystem } from '../platform/platform-types.ts';
import { notImplemented } from '../util/assert.ts';
import type { InputDevice } from './actions.ts';

/** 'touch' on Android, iOS or a coarse primary pointer; else 'keyboard'. */
export function detectInitialDevice(_window: Window, _os: OperatingSystem): InputDevice {
  return notImplemented('engine.detectInitialDevice');
}
