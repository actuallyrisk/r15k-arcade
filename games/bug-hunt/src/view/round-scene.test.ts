import { SIM_STEP_SECONDS } from '@r15k/engine';
import type { FrameContext, InputFrame } from '@r15k/engine';
import { describe, expect, test } from 'vitest';
import { TUNING } from '../content/tuning.ts';
import { roundHudPlacement } from './hud-placement.ts';
import { PAUSE_NODE_ID } from './round-a11y.ts';
import { RoundScene } from './round-scene.ts';
import {
  inputFrame,
  pointerAt,
  recordingContext,
  referenceLayout,
  withPressed,
} from './test-support/round-fixtures.ts';

const LAYOUT = referenceLayout('phone-portrait');
const HIT = roundHudPlacement(LAYOUT).pauseHit;
const ON_PAUSE = { x: HIT.x + 2, y: HIT.y + 2 };
const COUNTDOWN_STEPS = Math.round(TUNING.countdown.seconds / SIM_STEP_SECONDS);

/** A 60 Hz frame context with an input frame. */
function frameWith(
  input: InputFrame = inputFrame(),
  overrides: Partial<FrameContext> = {},
): FrameContext {
  return {
    input,
    layout: LAYOUT,
    timeMs: 0,
    deltaSeconds: 2 * SIM_STEP_SECONDS,
    isReducedMotion: false,
    a11yEvents: [],
    ...overrides,
  };
}

/** A round scene after `steps` idle fixed steps (one update per two steps, as on a 60 Hz display). */
function runningScene(
  steps: number,
  options: Parameters<typeof recordingContext>[0] = {},
): ReturnType<typeof recordingContext> & {
  readonly scene: RoundScene;
} {
  const recording = recordingContext(options);
  const scene = new RoundScene(recording.context);
  scene.enter();
  for (let index = 0; index < steps; index += 1) {
    if (index % 2 === 0) {
      scene.update(frameWith());
    }
    scene.fixedUpdate(SIM_STEP_SECONDS);
  }
  return { ...recording, scene };
}

describe('pause requests', () => {
  test('pause, back, a release on the button and its mirror node in one frame request one pause', () => {
    const { scene, record } = runningScene(10);
    const release = {
      id: 1,
      kind: 'touch' as const,
      downPosition: ON_PAUSE,
      position: ON_PAUSE,
      durationMs: 50,
      maxTravelCss: 0,
    };
    const input = { ...withPressed(inputFrame(), ['pause', 'back']), releases: [release] };
    scene.update(frameWith(input, { a11yEvents: [{ kind: 'activate', id: PAUSE_NODE_ID }] }));
    expect(record.pauses).toEqual(['player']);
  });

  test('a press on the pause button never moves the cat (touch and mouse); its release pauses', () => {
    for (const kind of ['touch', 'mouse'] as const) {
      const { scene, record } = runningScene(COUNTDOWN_STEPS + 20);
      const x = scene.state.cat.x;
      scene.update(
        frameWith(inputFrame({ pointer: pointerAt(ON_PAUSE, { kind }), moveTarget: ON_PAUSE.x })),
      );
      scene.fixedUpdate(SIM_STEP_SECONDS);
      scene.fixedUpdate(SIM_STEP_SECONDS);
      expect(scene.state.cat.x).toBe(x);
      expect(record.pauses).toEqual([]);
      const release = {
        id: 1,
        kind,
        downPosition: ON_PAUSE,
        position: ON_PAUSE,
        durationMs: 80,
        maxTravelCss: 0,
      };
      scene.update(frameWith(inputFrame({ releases: [release] })));
      expect(record.pauses).toEqual(['player']);
    }
  });
});

describe('lifecycle', () => {
  test('a lifecycle suspend asks for a pause while the round runs', () => {
    const { scene, record } = runningScene(5);
    scene.suspend('blur');
    expect(record.pauses).toEqual(['blur']);
  });
});

describe('resume', () => {
  test('pausing during the start countdown resumes without a second countdown', () => {
    const { scene, record } = runningScene(30);
    const sounds = record.sounds.length;
    scene.cover();
    scene.reveal();
    expect(scene.viewState.resumeSeconds).toBe(0);
    expect(record.sounds.length).toBe(sounds);
    const tick = scene.state.tick;
    scene.fixedUpdate(SIM_STEP_SECONDS);
    expect(scene.state.tick).toBe(tick + 1);
  });

  test('pausing a running round resumes with a 3-2-1 countdown that holds the simulation', () => {
    const { scene, record } = runningScene(COUNTDOWN_STEPS + 50);
    scene.cover();
    expect(scene.isAnimating()).toBe(false);
    scene.reveal();
    expect(scene.viewState.resumeSeconds).toBe(TUNING.resumeCountdownSeconds);
    expect(record.sounds.at(-1)).toBe('tick');
    expect(record.announcements.at(-1)).toBe('Resuming. 3');
    const tick = scene.state.tick;
    scene.fixedUpdate(SIM_STEP_SECONDS);
    expect(scene.state.tick).toBe(tick);
    scene.update(frameWith(inputFrame(), { deltaSeconds: 0.7 }));
    expect(record.announcements.at(-1)).toBe('2');
    scene.update(frameWith(inputFrame(), { deltaSeconds: 1.2 }));
    scene.fixedUpdate(SIM_STEP_SECONDS);
    expect(scene.state.tick).toBe(tick + 1);
  });
});

describe('input', () => {
  test('a tap in a frame without fixed steps reaches the simulation in the next step', () => {
    const { scene } = runningScene(COUNTDOWN_STEPS + 2);
    const at = { x: LAYOUT.field.x + 220, y: LAYOUT.field.y + 100 };
    scene.update(
      frameWith(
        inputFrame({
          pointer: pointerAt(at, { isDown: false, wasReleased: true }),
          moveTarget: at.x,
        }),
      ),
    );
    scene.update(frameWith());
    scene.fixedUpdate(SIM_STEP_SECONDS);
    expect(scene.state.cat.aimX).toBe(208);
  });

  test('held keys move the cat', () => {
    const { scene } = runningScene(4);
    const x = scene.state.cat.x;
    scene.update(frameWith(withPressed(inputFrame(), ['right'])));
    scene.fixedUpdate(SIM_STEP_SECONDS);
    expect(scene.state.cat.x).toBeGreaterThan(x);
  });
});

describe('round end', () => {
  test('reports the result once after the end delay and stops animating', () => {
    const steps = COUNTDOWN_STEPS + Math.round(TUNING.roundSeconds.arcade / SIM_STEP_SECONDS);
    const { scene, record } = runningScene(steps);
    expect(scene.state.phase).toBe('ended');
    expect(record.sounds.at(-1)).toMatch(/^(round-over|new-record)$/);
    expect(record.results).toEqual([]);
    for (let frame = 0; frame < 60; frame += 1) {
      scene.update(frameWith());
    }
    expect(record.results).toEqual([
      expect.objectContaining({
        gameId: 'bug-hunt',
        mode: 'arcade',
        seed: 1,
        score: scene.state.score,
      }),
    ]);
    expect(scene.isAnimating()).toBe(false);
    scene.suspend('hidden');
    scene.update(frameWith(withPressed(inputFrame(), ['pause'])));
    expect(record.pauses).toEqual([]);
  });

  test('the a11y tree has the field and the pause button once a frame was seen', () => {
    const { scene } = runningScene(2);
    expect(scene.a11y().nodes.map((node) => node.kind)).toEqual(['text', 'button']);
    expect(scene.isAnimating()).toBe(true);
  });
});
