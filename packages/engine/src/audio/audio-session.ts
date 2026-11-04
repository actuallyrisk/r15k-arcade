import { notImplemented } from '../util/assert.ts';

/** Sets `navigator.audioSession.type = 'ambient'` where available (respects the iPhone silent switch). */
export function setAmbientAudioSession(_navigator: Navigator): boolean {
  return notImplemented('engine.setAmbientAudioSession');
}
