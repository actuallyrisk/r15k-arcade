import { createEmitter } from '@r15k/engine';
import type { Unsubscribe } from '@r15k/engine';
import type { SettingsEnvironment } from '../settings/settings-model.ts';

/** The system preferences the 'system' settings follow, with change notifications. */
export interface EnvironmentWatcher {
  current(): SettingsEnvironment;
  /** Fires when the colour scheme or the reduced-motion preference changes. */
  subscribe(listener: () => void): Unsubscribe;
}

/** Watches prefers-color-scheme, prefers-reduced-motion and the preferred languages. */
export function createEnvironmentWatcher(window: Window): EnvironmentWatcher {
  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const changes = createEmitter<undefined>();
  const onChange = (): void => {
    changes.emit(undefined);
  };
  dark.addEventListener('change', onChange);
  reducedMotion.addEventListener('change', onChange);
  return {
    current: () => ({
      isDarkPreferred: dark.matches,
      isReducedMotionPreferred: reducedMotion.matches,
      languages: window.navigator.languages,
    }),
    subscribe: (listener) => changes.subscribe(listener),
  };
}
