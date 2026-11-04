import { notImplemented } from '@r15k/engine';
import type { Bindings, Result, SaveSchema } from '@r15k/engine';
import { SAVE_MIGRATIONS } from './save-migrations.ts';

/** One top-10 entry. */
export interface ScoreEntryV1 {
  /** Exactly 3 characters of INITIALS_ALPHABET. */
  readonly initials: string;
  /** Integer ≥ 1. */
  readonly score: number;
  /** Local date 'YYYY-MM-DD'. */
  readonly date: string;
}

/** Stored settings. */
export interface SettingsV1 {
  /** 0…100, multiple of 10. */
  readonly musicVolume: number;
  /** 0…100, multiple of 10. */
  readonly sfxVolume: number;
  readonly isMuted: boolean;
  readonly theme: 'system' | 'light' | 'dark';
  readonly language: 'system' | 'de' | 'en';
  readonly reducedMotion: 'system' | 'on' | 'off';
  readonly intro: 'full' | 'short' | 'off';
  /** DEFAULT_BINDINGS until the rebinding UI exists. */
  readonly bindings: Bindings;
}

/** The save document, version 1. */
export interface SaveDocumentV1 {
  readonly schemaVersion: 1;
  readonly settings: SettingsV1;
  /** At most 10 entries, sorted by descending score. */
  readonly scores: { readonly bugHunt: { readonly arcade: readonly ScoreEntryV1[] } };
  readonly meta: {
    readonly hasCompletedFirstLaunch: boolean;
    readonly launchCount: number;
    /** Default 'AAA'. */
    readonly lastInitials: string;
  };
}

/** Schema of the arcade save document (version 1 is the first, so there are no migrations yet). */
export const ARCADE_SAVE_SCHEMA: SaveSchema<SaveDocumentV1> = {
  currentVersion: 1,
  migrations: SAVE_MIGRATIONS,
  validate(_value: unknown): Result<SaveDocumentV1, readonly string[]> {
    return notImplemented('arcade.ARCADE_SAVE_SCHEMA.validate');
  },
  createDefault(): SaveDocumentV1 {
    return notImplemented('arcade.ARCADE_SAVE_SCHEMA.createDefault');
  },
};
