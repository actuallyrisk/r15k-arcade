import { rectContains } from '@r15k/engine';
import type {
  A11yTree,
  FrameContext,
  InputDevice,
  Layout,
  RenderContext,
  RoundContext,
  Scene,
  SuspendReason,
} from '@r15k/engine';
import { TUNING } from '../content/tuning.ts';
import { createInitialState } from '../sim/create.ts';
import type { SimEvent } from '../sim/events.ts';
import { toRoundStats } from '../sim/round-stats.ts';
import type { BugHuntState } from '../sim/state.ts';
import { step } from '../sim/step.ts';
import { createAimLatch } from './aim-latch.ts';
import { roundSfx } from './audio-events.ts';
import { roundHudPlacement } from './hud-placement.ts';
import type { HudPlacement } from './hud-placement.ts';
import { mapRoundInput } from './input-mapping.ts';
import { resumeDigit } from './overlays.ts';
import {
  PAUSE_NODE_ID,
  resumeAnnouncement,
  roundA11yTree,
  roundAnnouncements,
} from './round-a11y.ts';
import { advanceRoundView, createRoundViewState } from './round-view-state.ts';
import type { RoundViewState } from './round-view-state.ts';
import { renderRound } from './render-round.ts';

/** Whether the player asked for a pause this frame: P/Esc/Start, back, a release on the pause button or its mirror node. */
function isPauseRequested(frame: FrameContext, placement: HudPlacement): boolean {
  const { actions } = frame.input;
  if (actions.pause.wasPressed || actions.back.wasPressed) {
    return true;
  }
  const hit = placement.pauseHit;
  const isReleasedOnPause = frame.input.releases.some(
    (release) => rectContains(hit, release.downPosition) && rectContains(hit, release.position),
  );
  return (
    isReleasedOnPause ||
    frame.a11yEvents.some((event) => event.kind === 'activate' && event.id === PAUSE_NODE_ID)
  );
}

/**
 * A Bug Hunt round on the scene stack: steps the simulation at the fixed rate, keeps the view state,
 * plays sounds and announcements, requests pauses and reports the result after the round-end delay.
 */
export class RoundScene implements Scene {
  readonly id = 'bug-hunt-round';
  readonly isOverlay = false;
  private readonly context: RoundContext;
  private current: BugHuntState;
  private previous: BugHuntState;
  private view: RoundViewState;
  private layout: Layout | undefined;
  private lastDevice: InputDevice = 'keyboard';
  private isReducedMotion: boolean;
  private isCovered = false;
  private heldMove: -1 | 0 | 1 = 0;
  private readonly aim = createAimLatch();
  private resumeShownDigit = 0;
  private endSeconds: number | undefined;
  private hasFinished = false;

  /** A round in its countdown, seeded from the context. */
  constructor(context: RoundContext) {
    this.context = context;
    this.current = createInitialState({ seed: context.seed, mode: context.mode });
    this.previous = this.current;
    this.view = createRoundViewState(context.seed);
    this.isReducedMotion = context.services.settings().isReducedMotion;
  }

  /** The simulation state (for tests and the arcade's checks). */
  get state(): BugHuntState {
    return this.current;
  }

  /** The view state (for tests). */
  get viewState(): RoundViewState {
    return this.view;
  }

  /** Nothing to set up: the round starts in its countdown. */
  enter(): void {
    this.previous = this.current;
  }

  /** Nothing to release. */
  exit(): void {
    this.heldMove = 0;
  }

  /** Paused (or game over on top): stop stepping and drop held input. */
  cover(): void {
    this.isCovered = true;
    this.previous = this.current;
    this.heldMove = 0;
    this.aim.clear();
  }

  /** Back on top: a running round resumes with the 3-2-1 countdown; the start countdown simply goes on. */
  reveal(): void {
    this.isCovered = false;
    if (this.current.phase !== 'playing') {
      return;
    }
    this.view = { ...this.view, resumeSeconds: TUNING.resumeCountdownSeconds };
    this.resumeShownDigit = 0;
    this.tickResumeCountdown();
  }

  /** Input, pause requests, the resume countdown and the round-end delay (once per frame). */
  update(frame: FrameContext): void {
    this.layout = frame.layout;
    this.lastDevice = frame.input.lastDevice;
    this.isReducedMotion = frame.isReducedMotion;
    if (this.current.phase === 'ended') {
      this.waitForEnd(frame.deltaSeconds);
      return;
    }
    const placement = roundHudPlacement(frame.layout);
    if (isPauseRequested(frame, placement)) {
      this.heldMove = 0;
      this.aim.clear();
      this.context.onPauseRequested('player');
      return;
    }
    if (this.view.resumeSeconds > 0) {
      this.advanceView([], frame.deltaSeconds);
      this.tickResumeCountdown();
      return;
    }
    const mapped = mapRoundInput(frame.input, frame.layout, placement);
    this.heldMove = mapped.move;
    this.aim.offer(mapped.aimX);
  }

  /** One simulation step with the latched input, unless paused, resuming or ended. */
  fixedUpdate(dtSeconds: number): void {
    const isStepping =
      !this.isCovered && this.view.resumeSeconds <= 0 && this.current.phase !== 'ended';
    if (!isStepping) {
      this.previous = this.current;
      return;
    }
    const result = step(this.current, { move: this.heldMove, aimX: this.aim.take() }, dtSeconds);
    this.previous = this.current;
    this.current = result.state;
    this.advanceView(result.events, dtSeconds);
    this.report(result.events);
  }

  /** Draws the round (interpolated between the last two steps). */
  render(context: RenderContext): void {
    this.layout = context.layout;
    renderRound(context.target, {
      layout: context.layout,
      previous: this.previous,
      current: this.current,
      alpha: context.alpha,
      view: this.view,
      bestScore: this.context.bestScore,
      i18n: this.context.services.i18n,
      lastDevice: this.lastDevice,
      isReducedMotion: context.isReducedMotion,
    });
  }

  /** The playfield and the pause button. */
  a11y(): A11yTree {
    return roundA11yTree(this.context.services.i18n, this.layout);
  }

  /** True while the round runs or something of its view still moves; false while covered. */
  isAnimating(): boolean {
    if (this.isCovered) {
      return false;
    }
    if (this.current.phase !== 'ended' || !this.hasFinished) {
      return true;
    }
    const { view } = this;
    return (
      view.popups.length > 0 ||
      view.catchTweens.length > 0 ||
      view.banner !== undefined ||
      view.shakeSeconds > 0 ||
      view.catHopSeconds > 0
    );
  }

  /** App to background, blur, fold …: a running round asks for the pause overlay. */
  suspend(reason: SuspendReason): void {
    if (this.current.phase !== 'ended') {
      this.context.onPauseRequested(reason);
    }
  }

  /** Moves the view on by dt with the events of a step. */
  private advanceView(events: readonly SimEvent[], dt: number): void {
    this.view = advanceRoundView(this.view, {
      events,
      dt,
      isReducedMotion: this.isReducedMotion,
    });
  }

  /** Sounds and announcements of a step; the round end starts the delay before the result. */
  private report(events: readonly SimEvent[]): void {
    const { services } = this.context;
    for (const sound of roundSfx(events, this.context.bestScore)) {
      services.audio.playSfx(sound);
    }
    for (const text of roundAnnouncements(events, services.i18n)) {
      services.announce(text);
    }
    if (events.some((event) => event.kind === 'round-end')) {
      this.endSeconds = 0;
    }
  }

  /** A new resume digit ticks and is announced (the first one with "Resuming"). */
  private tickResumeCountdown(): void {
    const digit = resumeDigit(this.view.resumeSeconds);
    if (digit === 0 || digit === this.resumeShownDigit) {
      return;
    }
    const isFirst = this.resumeShownDigit === 0;
    this.resumeShownDigit = digit;
    this.context.services.audio.playSfx('tick');
    this.context.services.announce(resumeAnnouncement(digit, isFirst, this.context.services.i18n));
  }

  /** After the round end: the last frame stays for the delay, then the result is reported once. */
  private waitForEnd(deltaSeconds: number): void {
    this.previous = this.current;
    this.advanceView([], deltaSeconds);
    this.endSeconds = (this.endSeconds ?? 0) + deltaSeconds;
    if (this.hasFinished || this.endSeconds < TUNING.view.roundEndDelaySeconds) {
      return;
    }
    this.hasFinished = true;
    const { current, context } = this;
    context.onFinished({
      gameId: 'bug-hunt',
      mode: current.mode,
      seed: current.seed,
      score: current.score,
      stats: toRoundStats(current),
    });
  }
}
