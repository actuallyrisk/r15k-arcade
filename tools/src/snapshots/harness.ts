// R15K Arcade tools – renders a snapshot case into the indexed framebuffer in Node. Everything from other
// packages (palette LUT, fonts, translator, fake platform, layout) is resolved inside the call, so
// importing the harness evaluates none of it. Scenes run on a simulated 60 Hz display with exactly two
// fixed simulation steps per frame (frames = seconds × 60). The layout is computed for the playfield of
// the app's game (240 logical px wide, 120–480 high, ADR 0004), as the app itself does.
import {
  clearFramebuffer,
  computeLayout,
  createDrawTarget,
  createFakeClock,
  createFakePlatform,
  createFramebuffer,
  createIdleInputFrame,
  createTranslator,
  referenceSnapshot,
  SIM_STEP_SECONDS,
  SLOT,
} from '@r15k/engine';
import type {
  DrawTarget,
  FakeClock,
  InputFrame,
  LayoutResult,
  PlayfieldSpec,
  Scene,
  ViewportSnapshot,
} from '@r15k/engine';
import { getPaletteLut, getUiFonts } from '@r15k/ui';
import type { PaletteId } from '@r15k/ui';
import { framebufferToImage } from '../png/png-diff.ts';
import type { RgbaImage } from '../png/png-encode.ts';
import type { SnapshotCase, SnapshotEnvironment } from './snapshot-case.ts';

/** The playfield every app layout is computed for (the field of the one game, ADR 0004). */
const SNAPSHOT_PLAYFIELD: PlayfieldSpec = { width: 240, minHeight: 120, maxHeight: 480 };
/** One frame of the simulated 60 Hz display in milliseconds. */
const FRAME_MS = 1000 / 60;
/** Fixed simulation steps per display frame (120 Hz simulation on a 60 Hz display). */
const STEPS_PER_FRAME = 2;

/** What runScene draws into and reads the time from. */
interface SceneStage {
  readonly target: DrawTarget;
  readonly layout: LayoutResult;
  readonly clock: FakeClock;
}

/** The viewport snapshot of a case: a reference viewport or the case's own snapshot. */
function viewportOf(snapshotCase: SnapshotCase): ViewportSnapshot {
  return typeof snapshotCase.viewport === 'string'
    ? referenceSnapshot(snapshotCase.viewport)
    : snapshotCase.viewport;
}

/** `enter()`, then `frames` frames of update + two fixed steps, then one render on cleared paper. */
function runScene(
  scene: Scene,
  options: { readonly frames: number; readonly input?: InputFrame },
  stage: SceneStage,
): void {
  const { target, layout, clock } = stage;
  if (layout.kind !== 'ok') {
    throw new Error('runScene needs a Layout');
  }
  if (!Number.isInteger(options.frames) || options.frames < 0) {
    throw new Error(`runScene needs a whole number of frames ≥ 0, got ${options.frames}`);
  }
  const input = options.input ?? createIdleInputFrame();
  const deltaSeconds = STEPS_PER_FRAME * SIM_STEP_SECONDS;
  scene.enter();
  for (let frame = 0; frame < options.frames; frame += 1) {
    clock.advance(FRAME_MS);
    const timeMs = clock.now();
    scene.update({ input, layout, timeMs, deltaSeconds, isReducedMotion: false, a11yEvents: [] });
    for (let step = 0; step < STEPS_PER_FRAME; step += 1) {
      scene.fixedUpdate(SIM_STEP_SECONDS);
    }
  }
  clearFramebuffer(target.framebuffer, SLOT.paper);
  scene.render({ target, layout, alpha: 0, timeMs: clock.now(), isReducedMotion: false });
}

/** A fresh environment for one case: framebuffer of the layout's logical size filled with paper. */
function createEnvironment(snapshotCase: SnapshotCase): SnapshotEnvironment {
  const layout = computeLayout(viewportOf(snapshotCase), SNAPSHOT_PLAYFIELD);
  const target = createDrawTarget(createFramebuffer(layout.logical));
  const clock = createFakeClock();
  const stage: SceneStage = { target, layout, clock };
  return {
    target,
    layout,
    fonts: getUiFonts(),
    i18n: createTranslator({ locale: snapshotCase.locale, catalogs: snapshotCase.catalogs }),
    clock,
    platform: createFakePlatform(),
    runScene: (scene, options) => {
      runScene(scene, options, stage);
    },
  };
}

/** Renders one case in one palette. */
export function renderSnapshot(snapshotCase: SnapshotCase, palette: PaletteId): RgbaImage {
  const environment = createEnvironment(snapshotCase);
  snapshotCase.draw(environment);
  return framebufferToImage(environment.target.framebuffer, getPaletteLut(palette));
}
