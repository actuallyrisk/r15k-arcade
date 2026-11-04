import { notImplemented } from '@r15k/engine';
import type { Locale } from '@r15k/engine';
import type { ResolvedSettings } from '../boot/app-services.ts';

/** Where resolved settings take effect (mixer, palette controller, translator and mirror). */
export interface SettingsPort {
  /** mixer.setLevel, level 0…1. */
  setLevel(bus: 'music' | 'sfx', level: number): void;
  /** mixer.setMuted. */
  setMuted(isMuted: boolean): void;
  /** Palette controller. */
  applyPalette(id: 'light' | 'dark'): void;
  /** New translator and mirror.setLocale. */
  setLocale(locale: Locale): void;
}

/** Calls only the port methods whose value changed (all of them when `previous` is undefined). */
export function applyResolvedSettings(
  _port: SettingsPort,
  _previous: ResolvedSettings | undefined,
  _next: ResolvedSettings,
): void {
  return notImplemented('arcade.applyResolvedSettings');
}
