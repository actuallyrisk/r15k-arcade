import type {
  AudioMixer,
  Clock,
  Locale,
  Logger,
  PauseReason,
  Platform,
  RoundResult,
  SaveStore,
  Translator,
} from '@r15k/engine';
import type { UiFonts } from '@r15k/ui';
import type { SaveDocumentV1, SettingsV1 } from '../save/save-schema.ts';

/** Everything scenes get from the app. */
export interface AppServices {
  readonly clock: Clock;
  readonly logger: Logger;
  readonly platform: Platform;
  readonly save: SaveStore<SaveDocumentV1>;
  readonly mixer: AudioMixer;
  readonly input: InputControl;
  /** Current translator (changes with the language setting). */
  readonly i18n: () => Translator;
  readonly fonts: UiFonts;
  readonly announce: (text: string) => void;
  readonly settings: () => ResolvedSettings;
  /** Saves, resolves and applies a settings change. */
  readonly updateSettings: (change: (settings: SettingsV1) => SettingsV1) => void;
  readonly navigation: Navigation;
  /** App: the package version; snapshots: SNAPSHOT_APP_VERSION. */
  readonly appVersion: string;
}

/** The part of the input manager scenes may control. */
export interface InputControl {
  setTextEntry(isOn: boolean): void;
}

/** Settings resolved against the system preferences. */
export interface ResolvedSettings {
  readonly locale: Locale;
  readonly paletteId: 'light' | 'dark';
  readonly isReducedMotion: boolean;
  readonly raw: SettingsV1;
}

/** Every scene transition of the app. */
export interface Navigation {
  /** → intro (unless intro 'off' and not the first launch) or hub. */
  afterBoot(): void;
  /** stack.reset(hub). */
  toHub(): void;
  /** Push. */
  openSettings(): void;
  /** Transition, at its midpoint reset(round); seed = createEntropySeed(). */
  startRound(): void;
  /** Push the pause overlay. */
  pauseRound(reason: PauseReason): void;
  /** Pop → round.reveal(). */
  resumeRound(): void;
  /** Push the game-over overlay on the frozen round. */
  finishRound(result: RoundResult): void;
  /** Reset: initials (qualifies) or top-10 (the round leaves the stack). */
  continueAfterGameOver(result: RoundResult): void;
  /** Insert, save, replace: top-10 (highlight). */
  submitInitials(result: RoundResult, initials: string): void;
  /** One screen back. */
  back(): void;
}
