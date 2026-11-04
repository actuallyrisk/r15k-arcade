import { DEFAULT_BINDINGS, notImplemented } from '@r15k/engine';
import type { SaveDocumentV1, SettingsV1 } from './save-schema.ts';

/** Settings of a fresh install. */
export const DEFAULT_SETTINGS: SettingsV1 = {
  musicVolume: 70,
  sfxVolume: 80,
  isMuted: false,
  theme: 'system',
  language: 'system',
  reducedMotion: 'system',
  intro: 'short',
  bindings: DEFAULT_BINDINGS,
};

/** The save document of a fresh install. */
export function createDefaultSave(): SaveDocumentV1 {
  return notImplemented('arcade.createDefaultSave');
}
