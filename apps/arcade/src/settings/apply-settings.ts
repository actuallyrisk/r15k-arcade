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

/** Whether a resolved value differs between two settings (always true without previous settings). */
function hasChanged(
  previous: ResolvedSettings | undefined,
  next: ResolvedSettings,
  read: (settings: ResolvedSettings) => unknown,
): boolean {
  return previous === undefined || read(previous) !== read(next);
}

/** Calls only the port methods whose value changed (all of them when `previous` is undefined). */
export function applyResolvedSettings(
  port: SettingsPort,
  previous: ResolvedSettings | undefined,
  next: ResolvedSettings,
): void {
  if (hasChanged(previous, next, (settings) => settings.raw.musicVolume)) {
    port.setLevel('music', next.raw.musicVolume / 100);
  }
  if (hasChanged(previous, next, (settings) => settings.raw.sfxVolume)) {
    port.setLevel('sfx', next.raw.sfxVolume / 100);
  }
  if (hasChanged(previous, next, (settings) => settings.raw.isMuted)) {
    port.setMuted(next.raw.isMuted);
  }
  if (hasChanged(previous, next, (settings) => settings.paletteId)) {
    port.applyPalette(next.paletteId);
  }
  if (hasChanged(previous, next, (settings) => settings.locale)) {
    port.setLocale(next.locale);
  }
}
