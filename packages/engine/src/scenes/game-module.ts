import type { AudioPort, SfxDefinition } from '../audio/audio-types.ts';
import type { CatalogPair } from '../i18n/catalog.ts';
import type { Translator } from '../i18n/translator.ts';
import type { PlayfieldSpec } from '../layout/layout-types.ts';
import type { SuspendReason } from '../lifecycle/lifecycle-monitor.ts';
import type { Logger } from '../logger/logger.ts';
import type { DrawTarget } from '../render/draw-target.ts';
import type { Scene } from './scene.ts';

/** Game modes of this milestone. */
export type GameModeId = 'arcade';

/** Statistics of one finished round. */
export interface RoundStats {
  readonly bugsCaught: number;
  readonly goldenCaught: number;
  readonly bombsCaught: number;
  readonly misses: number;
  readonly bombsDodged: number;
  readonly bestStreak: number;
  readonly durationSeconds: number;
}

/** Result of one finished round. */
export interface RoundResult {
  readonly gameId: string;
  readonly mode: GameModeId;
  readonly seed: number;
  readonly score: number;
  readonly stats: RoundStats;
}

/** Settings a round reads every frame. */
export interface RoundSettings {
  readonly isReducedMotion: boolean;
}

/** App services a round may use. */
export interface RoundServices {
  readonly i18n: Translator;
  readonly audio: AudioPort;
  readonly announce: (text: string) => void;
  readonly logger: Logger;
  readonly settings: () => RoundSettings;
}

/** Why a round asks to be paused: the player, or a suspend of the app. */
export type PauseReason = 'player' | SuspendReason;

/** Everything a round gets from the app. */
export interface RoundContext {
  readonly mode: GameModeId;
  readonly seed: number;
  /** Shown as HI. */
  readonly bestScore: number;
  readonly services: RoundServices;
  readonly onFinished: (result: RoundResult) => void;
  /** 'player' for P/Esc/Start/pause button/a11y. */
  readonly onPauseRequested: (reason: PauseReason) => void;
}

/** Options of the hub cabinet preview. */
export interface CabinetScreenOptions {
  readonly timeMs: number;
  readonly isReducedMotion: boolean;
}

/** Contract between the arcade app and a game. */
export interface GameModule {
  /** 'bug-hunt'. */
  readonly id: string;
  /** i18n key. */
  readonly titleKey: string;
  readonly modes: readonly GameModeId[];
  readonly playfield: PlayfieldSpec;
  readonly catalogs: CatalogPair;
  readonly sfx: readonly SfxDefinition[];
  createRound(context: RoundContext): Scene;
  /** Hub preview, any size ≥ 64×48. */
  drawCabinetScreen(target: DrawTarget, options: CabinetScreenOptions): void;
}
