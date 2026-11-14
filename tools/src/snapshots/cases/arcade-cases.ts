// R15K Arcade tools – pixel snapshot cases of the arcade app (ids start with 'arcade-'). Scenes run with
// the app's snapshot services (memory save seeded with fixed scores, fake mixer, no navigation) in the
// harness's 60 Hz frame model; overlays are drawn over a round that ran in the same environment.
import { createIdleInputFrame, ZERO_INSETS } from '@r15k/engine';
import type {
  Action,
  ActionState,
  InputFrame,
  Locale,
  ReferenceViewportId,
  RoundResult,
  Scene,
  ViewportSnapshot,
} from '@r15k/engine';
import { UI_CATALOGS } from '@r15k/ui';
import { BUG_HUNT_CATALOGS, BUG_HUNT_GAME } from '@r15k/bug-hunt';
import {
  ARCADE_CATALOGS,
  createDefaultSave,
  createGameOverScene,
  createHubScene,
  createInitialsScene,
  createIntroScene,
  createPauseScene,
  createSettingsScene,
  createSnapshotServices,
  createTop10Scene,
  drawTooSmall,
} from '@r15k/arcade';
import type { AppServices, SaveDocumentV1, ScoreEntryV1 } from '@r15k/arcade';
import type { SnapshotCase, SnapshotEnvironment } from '../snapshot-case.ts';

/** Fixed top-10 entries of the cases (initials, score). */
const ENTRIES: readonly (readonly [string, number])[] = [
  ['ACE', 4210],
  ['BUG', 3905],
  ['CAT', 2750],
  ['DEV', 1980],
  ['EGG', 1501],
  ['FOX', 990],
  ['GO4', 640],
  ['HEX', 320],
  ['ICE', 151],
  ['JOY', 42],
];
/** Frames of the simulated 60 Hz display per second. */
const FRAMES_PER_SECOND = 60;
/** Seed of the rounds under the overlays (its idle round scores 10 points). */
const ROUND_SEED = 2;
/** A finished round of the initials case. */
const INITIALS_RESULT: RoundResult = {
  gameId: 'bug-hunt',
  mode: 'arcade',
  seed: ROUND_SEED,
  score: 2800,
  stats: {
    bugsCaught: 0,
    goldenCaught: 0,
    bombsCaught: 0,
    misses: 0,
    bombsDodged: 0,
    bestStreak: 0,
    durationSeconds: 60,
  },
};
/** The custom viewport of the too-small case: 200 × 150 CSS px at DPR 1. */
const TOO_SMALL_VIEWPORT: ViewportSnapshot = {
  cssWidth: 200,
  cssHeight: 150,
  devicePixelRatio: 1,
  deviceWidth: 200,
  deviceHeight: 150,
  safeArea: ZERO_INSETS,
  posture: { posture: 'flat', segments: [] },
};

/** A save document with the first `count` fixed entries. */
function documentWith(count: number): SaveDocumentV1 {
  const fresh = createDefaultSave();
  const arcade: readonly ScoreEntryV1[] = ENTRIES.slice(0, count).map(([initials, score]) => ({
    initials,
    score,
    date: '2026-11-04',
  }));
  return { ...fresh, scores: { bugHunt: { arcade } } };
}

/** The snapshot services of a case's environment. */
function servicesFor(
  environment: SnapshotEnvironment,
  context: { readonly locale: Locale; readonly scores: number },
): AppServices {
  return createSnapshotServices({
    locale: context.locale,
    platform: environment.platform,
    clock: environment.clock,
    initialDocument: documentWith(context.scores),
  });
}

/** An idle input frame with one action pressed once (one navigation pulse). */
function pressed(action: Action): InputFrame {
  const idle = createIdleInputFrame('keyboard');
  const state: ActionState = { isHeld: true, wasPressed: true, wasReleased: false, pulses: 1 };
  return { ...idle, actions: { ...idle.actions, [action]: state } };
}

/** An arcade case: the three catalogs the app translator uses. */
function arcadeCase(
  id: string,
  spec: {
    readonly viewport: ReferenceViewportId | ViewportSnapshot;
    readonly locale: Locale;
    readonly draw: (environment: SnapshotEnvironment, locale: Locale) => void;
  },
): SnapshotCase {
  return {
    id: `arcade-${id}`,
    viewport: spec.viewport,
    locale: spec.locale,
    catalogs: [UI_CATALOGS, BUG_HUNT_CATALOGS, ARCADE_CATALOGS],
    draw: (environment) => {
      spec.draw(environment, spec.locale);
    },
  };
}

/** A case that runs one scene of the app for some frames. */
function sceneCase(
  id: string,
  spec: {
    readonly viewport: ReferenceViewportId;
    readonly locale: Locale;
    readonly scores: number;
    readonly frames: number;
    readonly input?: InputFrame;
    readonly scene: (services: AppServices) => Scene;
  },
): SnapshotCase {
  return arcadeCase(id, {
    viewport: spec.viewport,
    locale: spec.locale,
    draw: (environment, locale) => {
      const services = servicesFor(environment, { locale, scores: spec.scores });
      environment.runScene(spec.scene(services), {
        frames: spec.frames,
        ...(spec.input === undefined ? {} : { input: spec.input }),
      });
    },
  });
}

/** A round of the services' game with the fixed seed; reports its result when it finishes. */
function createRound(services: AppServices, onFinished: (result: RoundResult) => void): Scene {
  return BUG_HUNT_GAME.createRound({
    mode: 'arcade',
    seed: ROUND_SEED,
    bestScore: 0,
    services: {
      i18n: services.i18n(),
      audio: services.mixer,
      announce: services.announce,
      logger: services.logger,
      settings: () => ({ isReducedMotion: false }),
    },
    onFinished,
    onPauseRequested: () => undefined,
  });
}

/** Runs a round for `seconds`, then draws an overlay scene over it (entered and rendered once). */
function overlayOverRound(
  environment: SnapshotEnvironment,
  context: {
    readonly services: AppServices;
    readonly seconds: number;
    readonly overlay: (result: RoundResult | undefined) => Scene;
  },
): void {
  const { layout } = environment;
  if (layout.kind !== 'ok') {
    throw new Error('overlay cases need a layout');
  }
  let result: RoundResult | undefined;
  const round = createRound(context.services, (finished) => {
    result = finished;
  });
  environment.runScene(round, { frames: context.seconds * FRAMES_PER_SECOND });
  round.cover();
  const overlay = context.overlay(result);
  overlay.enter();
  const timeMs = environment.clock.now();
  overlay.update({
    input: createIdleInputFrame('keyboard'),
    layout,
    timeMs,
    deltaSeconds: 1 / FRAMES_PER_SECOND,
    isReducedMotion: false,
    a11yEvents: [],
  });
  overlay.render({ target: environment.target, layout, alpha: 0, timeMs, isReducedMotion: false });
}

/** The overlay cases: pause over a running round, game over (new record) over a finished one. */
const OVERLAY_CASES: readonly SnapshotCase[] = [
  arcadeCase('pause', {
    viewport: 'handheld',
    locale: 'en',
    draw: (environment, locale) => {
      const services = servicesFor(environment, { locale, scores: 3 });
      overlayOverRound(environment, {
        services,
        seconds: 5,
        overlay: () => createPauseScene(services),
      });
    },
  }),
  arcadeCase('game-over', {
    viewport: 'phone-portrait',
    locale: 'de',
    draw: (environment, locale) => {
      const services = servicesFor(environment, { locale, scores: 0 });
      overlayOverRound(environment, {
        services,
        seconds: 63,
        overlay: (result) => {
          if (result === undefined) {
            throw new Error('the round of the game-over case did not finish');
          }
          return createGameOverScene(services, { result, previousBest: 0 });
        },
      });
    },
  }),
];

/** A scene factory of the app. */
type SceneFactory = (services: AppServices) => Scene;

/** Scenes rendered right after enter(): id, viewport, locale, stored scores, scene. */
const STILL_CASES: readonly (readonly [
  string,
  ReferenceViewportId,
  Locale,
  number,
  SceneFactory,
])[] = [
  ['hub-portrait', 'phone-portrait', 'en', 3, createHubScene],
  ['hub-landscape', 'desktop', 'de', 10, createHubScene],
  ['hub-phone-landscape', 'phone-landscape', 'en', 3, createHubScene],
  ['hub-ultrawide', 'ultrawide', 'de', 5, createHubScene],
  ['hub-tabletop', 'fold-tabletop', 'en', 3, createHubScene],
  ['settings-cover', 'fold-cover', 'de', 0, createSettingsScene],
  ['settings-desktop', 'desktop', 'en', 0, createSettingsScene],
  ['settings-tabletop', 'fold-tabletop', 'de', 0, createSettingsScene],
  [
    'top10',
    'phone-landscape',
    'en',
    10,
    (services) => createTop10Scene(services, { highlightRank: 4 }),
  ],
  [
    'top10-ultrawide',
    'ultrawide',
    'en',
    10,
    (services) => createTop10Scene(services, { highlightRank: undefined }),
  ],
];

/** Settings scrolled to the end: one ArrowDown per frame from Music to Intro. */
const scrolledSettings = (id: string, locale: Locale): SnapshotCase =>
  sceneCase(id, {
    viewport: 'phone-landscape',
    locale,
    scores: 0,
    frames: 6,
    input: pressed('down'),
    scene: createSettingsScene,
  });

/** Snapshot cases of the arcade app. */
export const ARCADE_CASES: readonly SnapshotCase[] = [
  sceneCase('intro-game-over', {
    viewport: 'phone-portrait',
    locale: 'en',
    scores: 0,
    frames: FRAMES_PER_SECOND,
    scene: (services) => createIntroScene(services, 'full'),
  }),
  sceneCase('intro-continue', {
    viewport: 'desktop',
    locale: 'en',
    scores: 0,
    frames: 4 * FRAMES_PER_SECOND,
    scene: (services) => createIntroScene(services, 'full'),
  }),
  ...STILL_CASES.map(([id, viewport, locale, scores, scene]) =>
    sceneCase(id, { viewport, locale, scores, frames: 0, scene }),
  ),
  scrolledSettings('settings-phone-landscape', 'en'),
  scrolledSettings('settings-phone-landscape-de', 'de'),
  ...OVERLAY_CASES,
  sceneCase('initials', {
    viewport: 'tablet-landscape',
    locale: 'en',
    scores: 2,
    frames: 1,
    input: pressed('right'),
    scene: (services) => createInitialsScene(services, { result: INITIALS_RESULT, rank: 3 }),
  }),
  arcadeCase('too-small', {
    viewport: TOO_SMALL_VIEWPORT,
    locale: 'en',
    draw: (environment) => {
      drawTooSmall(environment.target, environment.layout, environment.i18n);
    },
  }),
];
