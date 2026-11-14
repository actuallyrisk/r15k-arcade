// R15K Arcade tools – pixel snapshot cases of Bug Hunt (ids start with 'bug-hunt-'). Each round case
// replays a recorded or bot-driven round to a tick, builds the view state from every step's events and
// renders that state (previous = current, alpha 0) into the case's reference layout.
import { readFileSync } from 'node:fs';
import {
  centerRect,
  REFERENCE_VIEWPORTS,
  SIM_STEP_HZ,
  SIM_STEP_SECONDS,
  subTarget,
} from '@r15k/engine';
import type { InputDevice, Layout, Locale, ReferenceViewportId } from '@r15k/engine';
import { UI_CATALOGS } from '@r15k/ui';
import {
  advanceRoundView,
  botInput,
  BUG_HUNT_CATALOGS,
  BUG_HUNT_GAME,
  createInitialState,
  createRoundViewState,
  inputAt,
  parseReplay,
  renderRound,
  step,
  TUNING,
} from '@r15k/bug-hunt';
import type { BugHuntInput, BugHuntState, Replay, RoundViewState, SimEvent } from '@r15k/bug-hunt';
import { repoPath } from '../../shared/repo-paths.ts';
import type { SnapshotCase, SnapshotEnvironment } from '../snapshot-case.ts';

/** HI shown in every round case. */
const BEST_SCORE = 42;
/** Fixed simulation steps per 60 Hz view frame. */
const STEPS_PER_FRAME = 2;
/** Ticks of the start countdown. */
const COUNTDOWN_TICKS = Math.round(TUNING.countdown.seconds * SIM_STEP_HZ);
/** Size of the hub cabinet screen of the cabinet case. */
const CABINET_SCREEN = { width: 96, height: 72 } as const;

/** A round replayed to a point: the state and the view built from every step. */
interface ReplayedRound {
  readonly state: BugHuntState;
  readonly view: RoundViewState;
}

/** The input of a step: the bot, or a recorded replay's input log. */
type InputSource = (state: BugHuntState) => BugHuntInput;

/** The recorded input of a replay file as an input source (read by the state's tick). */
function replayInput(file: string): InputSource {
  const text = readFileSync(repoPath('games', 'bug-hunt', 'replays', file), 'utf8');
  const parsed = parseReplay(JSON.parse(text));
  if (!parsed.ok) {
    throw new Error(`invalid replay ${file}: ${parsed.error.join('; ')}`);
  }
  const replay: Replay = parsed.value;
  let cursor = 0;
  return (state) => {
    const read = inputAt(replay.inputs, state.tick, cursor);
    cursor = read.cursor;
    return read.input;
  };
}

/** A round from its start that steps the simulation and advances the view with every step's events. */
function startRound(
  seed: number,
  input: InputSource,
): {
  readonly step: () => readonly SimEvent[];
  readonly round: () => ReplayedRound;
} {
  let state = createInitialState({ seed, mode: 'arcade' });
  let view = createRoundViewState(seed);
  return {
    step: () => {
      const result = step(state, input(state), SIM_STEP_SECONDS);
      state = result.state;
      view = advanceRoundView(view, {
        events: result.events,
        dt: SIM_STEP_SECONDS,
        isReducedMotion: false,
      });
      return result.events;
    },
    round: () => ({ state, view }),
  };
}

/** The round after `ticks` steps. */
function roundAfterTicks(seed: number, input: InputSource, ticks: number): ReplayedRound {
  const round = startRound(seed, input);
  for (let tick = 0; tick < ticks; tick += 1) {
    round.step();
  }
  return round.round();
}

/** The round `extraSteps` steps after the first step with an event of `kind`. */
function roundAfterEvent(
  seed: number,
  input: InputSource,
  rule: { readonly kind: SimEvent['kind']; readonly extraSteps: number },
): ReplayedRound {
  const round = startRound(seed, input);
  for (;;) {
    const events = round.step();
    if (events.some((event) => event.kind === rule.kind)) {
      break;
    }
    if (round.round().state.phase === 'ended') {
      throw new Error(`round ${seed} ended without a '${rule.kind}' event`);
    }
  }
  for (let extra = 0; extra < rule.extraSteps; extra += 1) {
    round.step();
  }
  return round.round();
}

/** The layout of a snapshot environment; round cases never use the too-small layout. */
function layoutOf(environment: SnapshotEnvironment): Layout {
  if (environment.layout.kind !== 'ok') {
    throw new Error('a round snapshot needs a layout');
  }
  return environment.layout;
}

/** The last used device a reference viewport stands for: touch on touch screens, else keyboard. */
function deviceOf(viewport: ReferenceViewportId): InputDevice {
  return REFERENCE_VIEWPORTS.find((entry) => entry.id === viewport)?.hasTouch === true
    ? 'touch'
    : 'keyboard';
}

/** A case that renders a replayed round. */
function roundCase(options: {
  readonly id: string;
  readonly viewport: ReferenceViewportId;
  readonly locale: Locale;
  readonly round: () => ReplayedRound;
}): SnapshotCase {
  return {
    id: options.id,
    viewport: options.viewport,
    locale: options.locale,
    catalogs: [UI_CATALOGS, BUG_HUNT_CATALOGS],
    draw(environment) {
      const { state, view } = options.round();
      renderRound(environment.target, {
        layout: layoutOf(environment),
        previous: state,
        current: state,
        alpha: 0,
        view,
        bestScore: BEST_SCORE,
        i18n: environment.i18n,
        lastDevice: deviceOf(options.viewport),
        isReducedMotion: false,
      });
    },
  };
}

/** The bot round of seed 1 after `ticks` steps. */
function botAt(ticks: number): () => ReplayedRound {
  return () => roundAfterTicks(1, botInput, ticks);
}

/** Snapshot cases of Bug Hunt. */
export const BUG_HUNT_CASES: readonly SnapshotCase[] = [
  roundCase({
    id: 'bug-hunt-countdown',
    viewport: 'phone-portrait',
    locale: 'en',
    round: botAt(30),
  }),
  roundCase({
    id: 'bug-hunt-countdown-cover',
    viewport: 'fold-cover',
    locale: 'de',
    round: botAt(30),
  }),
  roundCase({
    id: 'bug-hunt-play-stacked',
    viewport: 'phone-portrait',
    locale: 'en',
    round: botAt(1500),
  }),
  roundCase({
    id: 'bug-hunt-catch-tall',
    viewport: 'phone-portrait',
    locale: 'en',
    round: () => roundAfterEvent(1, botInput, { kind: 'catch', extraSteps: 2 * STEPS_PER_FRAME }),
  }),
  roundCase({ id: 'bug-hunt-play-sides', viewport: 'desktop', locale: 'de', round: botAt(1500) }),
  roundCase({
    id: 'bug-hunt-bomb',
    viewport: 'phone-landscape',
    locale: 'en',
    round: () =>
      roundAfterEvent(3, replayInput('arcade-pointer-seed-3.json'), {
        kind: 'bomb',
        extraSteps: 3 * STEPS_PER_FRAME,
      }),
  }),
  roundCase({
    id: 'bug-hunt-warning-tabletop',
    viewport: 'fold-tabletop',
    locale: 'de',
    round: botAt(COUNTDOWN_TICKS + 6900),
  }),
  roundCase({
    id: 'bug-hunt-play-tabletop-l',
    viewport: 'fold-tabletop-l',
    locale: 'en',
    round: botAt(1500),
  }),
  {
    id: 'bug-hunt-cabinet',
    viewport: 'desktop',
    locale: 'en',
    catalogs: [UI_CATALOGS, BUG_HUNT_CATALOGS],
    draw(environment: SnapshotEnvironment): void {
      const { width, height } = environment.target.framebuffer;
      const screen = centerRect({ x: 0, y: 0, width, height }, CABINET_SCREEN);
      BUG_HUNT_GAME.drawCabinetScreen(subTarget(environment.target, screen), {
        timeMs: 0,
        isReducedMotion: false,
      });
    },
  },
];
