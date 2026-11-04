import { createIdleInputFrame, fillRect, setPixel, SIM_STEP_SECONDS, SLOT } from '@r15k/engine';
import type { CatalogPair, ViewportSnapshot } from '@r15k/engine';
import { expect, test, vi } from 'vitest';
import { renderSnapshot } from './harness.ts';
import type { SnapshotCase, SnapshotEnvironment } from './snapshot-case.ts';
import { fakeLutEntry, getUiFonts } from './test-support/fake-ui.ts';
import { createRecordingScene } from './test-support/recording-scene.ts';

vi.mock('@r15k/ui', () => import('./test-support/fake-ui.ts'));

const CATALOGS: readonly CatalogPair[] = [
  { namespace: 'test', en: { 'test.hello': 'Hello' }, de: { 'test.hello': 'Hallo' } },
];

const TOO_SMALL: ViewportSnapshot = {
  cssWidth: 200,
  cssHeight: 150,
  devicePixelRatio: 1,
  deviceWidth: 200,
  deviceHeight: 150,
  safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  posture: { posture: 'flat', segments: [] },
};

/** An inline case that hands its environment to `draw`. */
function inlineCase(
  draw: (environment: SnapshotEnvironment) => void,
  viewport: SnapshotCase['viewport'] = 'desktop',
): SnapshotCase {
  return { id: 'tools-inline', viewport, locale: 'de', catalogs: CATALOGS, draw };
}

/** The RGBA bytes of one pixel. */
const pixelAt = (data: Uint8Array, offset: number): readonly number[] => [
  ...data.subarray(offset * 4, offset * 4 + 4),
];

/** RGBA bytes of a fake LUT entry. */
const rgbaOf = (entry: number): readonly number[] => [
  entry & 0xff,
  (entry >>> 8) & 0xff,
  (entry >>> 16) & 0xff,
  entry >>> 24,
];

test('the image has the layout size and maps the drawn slots through the palette LUT', () => {
  let width = 0;
  const image = renderSnapshot(
    inlineCase((environment) => {
      width = environment.target.framebuffer.width;
      setPixel(environment.target, { x: 1, y: 0 }, SLOT.ink);
    }),
    'dark',
  );
  expect(image.width).toBe(width);
  expect(image.data.length).toBe(image.width * image.height * 4);
  expect(pixelAt(image.data, 0)).toEqual(rgbaOf(fakeLutEntry('dark', SLOT.paper)));
  expect(pixelAt(image.data, 1)).toEqual(rgbaOf(fakeLutEntry('dark', SLOT.ink)));
});

/** The environment a desktop case receives. */
function capturedEnvironment(): SnapshotEnvironment {
  let seen: SnapshotEnvironment | undefined;
  renderSnapshot(
    inlineCase((environment) => {
      seen = environment;
    }),
    'light',
  );
  if (seen === undefined) {
    throw new Error('the case was not drawn');
  }
  return seen;
}

test('the environment carries the layout, the ui fonts, a translator, a fake clock and platform', () => {
  const environment = capturedEnvironment();
  expect(environment.layout.kind).toBe('ok');
  expect(environment.target.framebuffer.width).toBe(environment.layout.logical.width);
  expect(environment.target.framebuffer.height).toBe(environment.layout.logical.height);
  expect(environment.fonts).toBe(getUiFonts());
  expect(environment.i18n.locale).toBe('de');
  expect(environment.i18n.t('test.hello')).toBe('Hallo');
  expect(environment.clock.now()).toBe(0);
  expect(environment.platform.calls).toEqual([]);
});

test('runScene: enter, then per frame one update and two fixed steps, then one render', () => {
  const recording = createRecordingScene();
  renderSnapshot(
    inlineCase((environment) => {
      environment.runScene(recording.scene, { frames: 3 });
    }),
    'light',
  );
  const names = recording.calls.map((call) => call.name);
  const frame = ['update', 'fixedUpdate', 'fixedUpdate'];
  expect(names).toEqual(['enter', ...frame, ...frame, ...frame, 'render']);
  for (const call of recording.calls) {
    if (call.name === 'fixedUpdate') {
      expect(call.dtSeconds).toBe(SIM_STEP_SECONDS);
    }
  }
});

test('runScene frames run at 60 Hz with idle input, no reduced motion and no a11y events', () => {
  const recording = createRecordingScene();
  renderSnapshot(
    inlineCase((environment) => {
      environment.runScene(recording.scene, { frames: 3 });
    }),
    'light',
  );
  const updates = recording.calls.flatMap((call) => (call.name === 'update' ? [call.frame] : []));
  expect(updates.map((frame) => frame.timeMs)).toEqual([
    expect.closeTo(1000 / 60, 9),
    expect.closeTo(2000 / 60, 9),
    expect.closeTo(50, 9),
  ]);
  for (const frame of updates) {
    expect(frame.deltaSeconds).toBeCloseTo(1 / 60, 12);
    expect(frame.isReducedMotion).toBe(false);
    expect(frame.a11yEvents).toEqual([]);
    expect(frame.input).toEqual(createIdleInputFrame());
    expect(frame.layout.kind).toBe('ok');
  }
});

test('runScene renders once on cleared paper with alpha 0 at the time of the last frame', () => {
  const recording = createRecordingScene();
  const image = renderSnapshot(
    inlineCase((environment) => {
      fillRect(environment.target, environment.target.clip, SLOT.ink);
      environment.runScene(recording.scene, { frames: 3 });
    }),
    'light',
  );
  const render = recording.calls.at(-1);
  expect(render?.name === 'render' && render.isPaperOnly).toBe(true);
  expect(render?.name === 'render' && render.context.alpha).toBe(0);
  expect(render?.name === 'render' && render.context.timeMs).toBeCloseTo(50, 9);
  expect(render?.name === 'render' && render.context.isReducedMotion).toBe(false);
  expect(pixelAt(image.data, 0)).toEqual(rgbaOf(fakeLutEntry('light', SLOT.ink)));
  expect(pixelAt(image.data, 1)).toEqual(rgbaOf(fakeLutEntry('light', SLOT.paper)));
});

test('frames 0 renders the state right after enter, and a given input frame is passed on', () => {
  const recording = createRecordingScene();
  const input = { ...createIdleInputFrame('gamepad'), hadActivity: true };
  renderSnapshot(
    inlineCase((environment) => {
      environment.runScene(recording.scene, { frames: 0 });
      environment.runScene(recording.scene, { frames: 1, input });
    }),
    'light',
  );
  expect(recording.calls.map((call) => call.name).slice(0, 3)).toEqual([
    'enter',
    'render',
    'enter',
  ]);
  const update = recording.calls.find((call) => call.name === 'update');
  expect(update?.name === 'update' && update.frame.input).toBe(input);
});

test('a too-small viewport gives a too-small layout, and runScene throws there', () => {
  const recording = createRecordingScene();
  let kind = '';
  renderSnapshot(
    inlineCase((environment) => {
      kind = environment.layout.kind;
      expect(() => {
        environment.runScene(recording.scene, { frames: 1 });
      }).toThrow('runScene needs a Layout');
    }, TOO_SMALL),
    'game-boy',
  );
  expect(kind).toBe('too-small');
  expect(recording.calls).toEqual([]);
});

test('a fractional or negative frame count throws', () => {
  const recording = createRecordingScene();
  renderSnapshot(
    inlineCase((environment) => {
      expect(() => {
        environment.runScene(recording.scene, { frames: 1.5 });
      }).toThrow('whole number of frames');
      expect(() => {
        environment.runScene(recording.scene, { frames: -1 });
      }).toThrow('whole number of frames');
    }),
    'light',
  );
  expect(recording.calls).toEqual([]);
});
