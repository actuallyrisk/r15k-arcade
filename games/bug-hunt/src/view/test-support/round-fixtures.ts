// Fixtures of the round view tests: layouts of every reference viewport plus the extra layouts of the
// layout tests, input frames, a recording round context and simulation states at given ticks.
import {
  ACTIONS,
  computeLayout,
  createIdleInputFrame,
  createLogger,
  createMemorySink,
  createTranslator,
  REFERENCE_VIEWPORTS,
  referenceSnapshot,
  SIM_STEP_SECONDS,
  ZERO_INSETS,
} from '@r15k/engine';
import type {
  Action,
  ActionState,
  InputFrame,
  Layout,
  Locale,
  PointerSnapshot,
  RoundContext,
  RoundResult,
  PauseReason,
  Translator,
  ViewportSnapshot,
} from '@r15k/engine';
import { UI_CATALOGS } from '@r15k/ui';
import { TUNING } from '../../content/tuning.ts';
import { BUG_HUNT_CATALOGS } from '../../i18n/catalogs.ts';
import { botInput } from '../../sim/bot.ts';
import { createInitialState } from '../../sim/create.ts';
import type { SimEvent } from '../../sim/events.ts';
import type { BugHuntState } from '../../sim/state.ts';
import { step } from '../../sim/step.ts';

/** A flat custom viewport at DPR 1 without safe areas. */
export function flatViewport(cssWidth: number, cssHeight: number): ViewportSnapshot {
  return {
    cssWidth,
    cssHeight,
    devicePixelRatio: 1,
    deviceWidth: cssWidth,
    deviceHeight: cssHeight,
    safeArea: ZERO_INSETS,
    posture: { posture: 'flat', segments: [] },
  };
}

/** The book-posture viewport of the layout tests (673×841 @2.625, vertical fold). */
export const BOOK_VIEWPORT: ViewportSnapshot = {
  cssWidth: 673,
  cssHeight: 841,
  devicePixelRatio: 2.625,
  deviceWidth: 1767,
  deviceHeight: 2208,
  safeArea: { top: 24, right: 0, bottom: 16, left: 0 },
  posture: {
    posture: 'book',
    segments: [
      { x: 0, y: 0, width: 336, height: 841 },
      { x: 337, y: 0, width: 336, height: 841 },
    ],
  },
};

/** The layout of a viewport; throws when it is too small. */
export function layoutOf(viewport: ViewportSnapshot): Layout {
  const layout = computeLayout(viewport, TUNING.field);
  if (layout.kind !== 'ok') {
    throw new Error('viewport too small for a round');
  }
  return layout;
}

/** The layout of a reference viewport. */
export function referenceLayout(id: Parameters<typeof referenceSnapshot>[0]): Layout {
  return layoutOf(referenceSnapshot(id));
}

/** Every reference layout and the extra layouts (desktop @1, laptop @1.25, min window, book, banded). */
export function allLayouts(): readonly {
  readonly name: string;
  readonly layout: Layout;
  readonly k: number;
}[] {
  const extras: readonly [string, ViewportSnapshot][] = [
    ['desktop @1', flatViewport(1440, 900)],
    [
      'laptop @1.25',
      { ...flatViewport(1536, 864), devicePixelRatio: 1.25, deviceWidth: 1920, deviceHeight: 1080 },
    ],
    ['min window', flatViewport(480, 360)],
    ['book', BOOK_VIEWPORT],
    ['banded', flatViewport(260, 160)],
  ];
  const named = [
    ...REFERENCE_VIEWPORTS.map((viewport): [string, ViewportSnapshot] => [
      viewport.id,
      referenceSnapshot(viewport.id),
    ]),
    ...extras,
  ];
  return named.map(([name, viewport]) => {
    const layout = layoutOf(viewport);
    return { name, layout, k: layout.cssPerLogical };
  });
}

/** A translator over the UI and Bug Hunt catalogs. */
export function translator(locale: Locale = 'en'): Translator {
  return createTranslator({ locale, catalogs: [UI_CATALOGS, BUG_HUNT_CATALOGS] });
}

/** An input frame with overrides. */
export function inputFrame(overrides: Partial<InputFrame> = {}): InputFrame {
  return { ...createIdleInputFrame('touch'), ...overrides };
}

/** A steering pointer snapshot (pressed and held at `at` unless overridden). */
export function pointerAt(
  at: { readonly x: number; readonly y: number },
  overrides: Partial<PointerSnapshot> = {},
): PointerSnapshot {
  return {
    id: 1,
    kind: 'touch',
    position: at,
    downPosition: at,
    isDown: true,
    wasPressed: true,
    wasReleased: false,
    ...overrides,
  };
}

/** Pressed (and held) actions on top of a frame. */
export function withPressed(frame: InputFrame, names: readonly Action[]): InputFrame {
  const pressed: ActionState = { isHeld: true, wasPressed: true, wasReleased: false, pulses: 1 };
  const actions = Object.fromEntries(
    ACTIONS.map((action) => [action, names.includes(action) ? pressed : frame.actions[action]]),
  ) as Record<Action, ActionState>;
  return { ...frame, actions };
}

/** What a recording round context saw. */
export interface ContextRecord {
  readonly sounds: string[];
  readonly announcements: string[];
  readonly pauses: PauseReason[];
  readonly results: RoundResult[];
}

/** A round context that records sounds, announcements, pause requests and results. */
export function recordingContext(
  options: {
    readonly seed?: number;
    readonly bestScore?: number;
    readonly isReducedMotion?: boolean;
  } = {},
): {
  readonly context: RoundContext;
  readonly record: ContextRecord;
} {
  const record: ContextRecord = { sounds: [], announcements: [], pauses: [], results: [] };
  const context: RoundContext = {
    mode: 'arcade',
    seed: options.seed ?? 1,
    bestScore: options.bestScore ?? 0,
    services: {
      i18n: translator(),
      audio: {
        playSfx: (id) => record.sounds.push(id),
        playMusic: () => undefined,
        stopMusic: () => undefined,
      },
      announce: (text) => record.announcements.push(text),
      logger: createLogger({ isEnabled: false, sink: createMemorySink().sink }),
      settings: () => ({ isReducedMotion: options.isReducedMotion ?? false }),
    },
    onFinished: (result) => record.results.push(result),
    onPauseRequested: (reason) => record.pauses.push(reason),
  };
  return { context, record };
}

/** The bot round of a seed after `ticks` steps, with the events of every step. */
export function botRound(
  seed: number,
  ticks: number,
): { readonly state: BugHuntState; readonly steps: readonly (readonly SimEvent[])[] } {
  let state = createInitialState({ seed, mode: 'arcade' });
  const steps: (readonly SimEvent[])[] = [];
  for (let tick = 0; tick < ticks; tick += 1) {
    const result = step(state, botInput(state), SIM_STEP_SECONDS);
    state = result.state;
    steps.push(result.events);
  }
  return { state, steps };
}
