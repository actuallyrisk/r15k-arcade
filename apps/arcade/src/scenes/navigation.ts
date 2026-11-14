import { createEntropySeed, formatLocalDate, todayLocal } from '@r15k/engine';
import type { GameModule, PauseReason, RoundResult, Scene, SceneStack } from '@r15k/engine';
import type { AppServices, Navigation } from '../boot/app-services.ts';
import { settle } from '../boot/settle.ts';
import type { TransitionDriver } from '../boot/transition.ts';
import type { ScoreEntryV1 } from '../save/save-schema.ts';
import { bestScore, insertTop10, qualifiesForTop10 } from '../save/top10.ts';
import { createGameOverScene } from './game-over-scene.ts';
import { createHubScene } from './hub-scene.ts';
import { createInitialsScene } from './initials-scene.ts';
import { createIntroScene } from './intro-scene.ts';
import { createPauseScene } from './pause-scene.ts';
import { SCENE_IDS } from './scene-ids.ts';
import { createSettingsScene } from './settings-scene.ts';
import { createTop10Scene } from './top10-scene.ts';

/** Delay between pausing and suspending the audio, so the pause sound can play (ms). */
const PAUSE_SUSPEND_DELAY_MS = 150;
/** Fade-out of the hub music when a round starts (s). */
const ROUND_MUSIC_FADE_OUT_SECONDS = 0.4;

/** The navigation plus what the app shell needs to know about the round. */
export interface AppNavigation extends Navigation {
  /** A round is on the stack and has not finished. */
  readonly hasActiveRound: boolean;
  /** A pause overlay is on the stack or its push is queued. */
  readonly isPauseOpen: boolean;
  /** Resets the stack to the hub without a transition (repeated errors). */
  resetToHub(): void;
}

/** What the navigation needs besides the stack and the services. */
export interface NavigationOptions {
  readonly transition: TransitionDriver;
  readonly game: GameModule;
}

/** The round on the stack. */
interface RoundEntry {
  readonly scene: Scene;
  isFinished: boolean;
}

/** Every scene transition of the app; at most one stack operation per call. */
class ArcadeNavigation implements AppNavigation {
  private readonly stack: SceneStack;
  private readonly base: Omit<AppServices, 'navigation'>;
  private readonly options: NavigationOptions;
  private readonly services: AppServices;
  private pauseOverlay: Scene | undefined;
  private round: RoundEntry | undefined;
  private suspendTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    stack: SceneStack,
    base: Omit<AppServices, 'navigation'>,
    options: NavigationOptions,
  ) {
    this.stack = stack;
    this.base = base;
    this.options = options;
    this.services = { ...base, navigation: this };
  }

  get hasActiveRound(): boolean {
    return this.round !== undefined && !this.round.isFinished;
  }

  get isPauseOpen(): boolean {
    return this.pauseOverlay !== undefined;
  }

  afterBoot(): void {
    const { meta } = this.base.save.get();
    if (!meta.hasCompletedFirstLaunch) {
      this.base.save.update((document) => ({
        ...document,
        meta: { ...document.meta, hasCompletedFirstLaunch: true },
      }));
      this.stack.replace(createIntroScene(this.services, 'full'));
      return;
    }
    const { intro } = this.base.settings().raw;
    this.stack.replace(
      intro === 'off' ? createHubScene(this.services) : createIntroScene(this.services, intro),
    );
  }

  toHub(): void {
    this.closePause();
    this.leaveRound();
    this.options.transition.start(() => {
      this.stack.reset(createHubScene(this.services));
    });
  }

  resetToHub(): void {
    this.closePause();
    this.leaveRound();
    this.stack.reset(createHubScene(this.services));
  }

  openSettings(): void {
    this.stack.push(createSettingsScene(this.services));
  }

  startRound(): void {
    if (this.options.transition.isActive) {
      return;
    }
    const { platform, mixer, logger } = this.base;
    this.closePause();
    settle(platform.keepAwake.set(true), logger, 'keep-awake');
    settle(platform.immersive.set(true), logger, 'immersive mode');
    mixer.stopMusic({ fadeOutSeconds: ROUND_MUSIC_FADE_OUT_SECONDS });
    this.options.transition.start(() => {
      const scene = this.createRound();
      this.round = { scene, isFinished: false };
      this.stack.reset(scene);
    });
  }

  pauseRound(reason: PauseReason): void {
    if (this.pauseOverlay !== undefined || !this.hasActiveRound) {
      return;
    }
    const overlay = createPauseScene(this.services);
    this.pauseOverlay = overlay;
    this.stack.push(overlay);
    if (reason !== 'hidden' && reason !== 'pagehide') {
      this.base.mixer.playSfx('ui-pause');
    }
    this.cancelSuspendTimer();
    this.suspendTimer = setTimeout(() => {
      this.suspendTimer = undefined;
      this.base.mixer.suspend();
    }, PAUSE_SUSPEND_DELAY_MS);
  }

  resumeRound(): void {
    const overlay = this.pauseOverlay;
    if (overlay === undefined || this.stack.top !== overlay) {
      return;
    }
    this.closePause();
    this.stack.pop();
  }

  finishRound(result: RoundResult): void {
    if (this.round !== undefined) {
      this.round.isFinished = true;
    }
    const previousBest = bestScore(this.scores());
    this.stack.push(createGameOverScene(this.services, { result, previousBest }));
  }

  continueAfterGameOver(result: RoundResult): void {
    this.closePause();
    this.leaveRound();
    const entries = this.scores();
    if (!qualifiesForTop10(entries, result.score)) {
      this.stack.reset(createTop10Scene(this.services, { highlightRank: undefined }));
      return;
    }
    const { rank } = insertTop10(
      entries,
      this.entryFor(result, this.base.save.get().meta.lastInitials),
    );
    this.stack.reset(createInitialsScene(this.services, { result, rank }));
  }

  submitInitials(result: RoundResult, initials: string): void {
    const { entries, rank } = insertTop10(this.scores(), this.entryFor(result, initials));
    this.base.save.update((document) => ({
      ...document,
      scores: { ...document.scores, bugHunt: { ...document.scores.bugHunt, arcade: entries } },
      meta: { ...document.meta, lastInitials: initials },
    }));
    this.stack.replace(createTop10Scene(this.services, { highlightRank: rank }));
  }

  back(): void {
    switch (this.stack.top?.id) {
      case SCENE_IDS.settings:
        this.stack.pop();
        return;
      case SCENE_IDS.hub:
        this.leaveApp();
        return;
      case SCENE_IDS.initials:
        this.stack.replace(createTop10Scene(this.services, { highlightRank: undefined }));
        return;
      case SCENE_IDS.top10:
        this.toHub();
        return;
      case SCENE_IDS.pause:
        this.resumeRound();
        return;
      case undefined:
      default:
        return;
    }
  }

  /** Android: the hub's back moves the app to the background; elsewhere nothing happens. */
  private leaveApp(): void {
    const { backButton } = this.base.platform;
    if (backButton.isAvailable) {
      settle(backButton.moveToBackground(), this.base.logger, 'move to background');
    }
  }

  /** Forgets the pause overlay; when one was open, the audio suspension is undone. */
  private closePause(): void {
    if (this.pauseOverlay === undefined) {
      return;
    }
    this.pauseOverlay = undefined;
    this.cancelSuspendTimer();
    this.base.mixer.resume();
  }

  /** Cancels a pending audio suspension. */
  private cancelSuspendTimer(): void {
    if (this.suspendTimer !== undefined) {
      clearTimeout(this.suspendTimer);
      this.suspendTimer = undefined;
    }
  }

  /** The round leaves the stack: keep-awake and immersive mode end. */
  private leaveRound(): void {
    if (this.round === undefined) {
      return;
    }
    this.round = undefined;
    const { platform, logger } = this.base;
    settle(platform.keepAwake.set(false), logger, 'keep-awake');
    settle(platform.immersive.set(false), logger, 'immersive mode');
  }

  /** A new Arcade round of the game with a fresh seed. */
  private createRound(): Scene {
    const { base } = this;
    return this.options.game.createRound({
      mode: 'arcade',
      seed: createEntropySeed(),
      bestScore: bestScore(this.scores()),
      services: {
        i18n: base.i18n(),
        audio: base.mixer,
        announce: base.announce,
        logger: base.logger,
        settings: () => ({ isReducedMotion: base.settings().isReducedMotion }),
      },
      onFinished: (result) => {
        this.finishRound(result);
      },
      onPauseRequested: (reason) => {
        this.pauseRound(reason);
      },
    });
  }

  /** The stored Arcade top 10. */
  private scores(): readonly ScoreEntryV1[] {
    return this.base.save.get().scores.bugHunt.arcade;
  }

  /** The top-10 entry of a finished round, dated today. */
  private entryFor(result: RoundResult, initials: string): ScoreEntryV1 {
    return { initials, score: result.score, date: formatLocalDate(todayLocal(this.base.clock)) };
  }
}

/** The app navigation; `services.navigation` is this object, wired by createApp. */
export function createNavigation(
  stack: SceneStack,
  services: Omit<AppServices, 'navigation'>,
  options: NavigationOptions,
): AppNavigation {
  return new ArcadeNavigation(stack, services, options);
}
