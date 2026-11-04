// Literal input, layout and frame values for scene, stack and mirror tests. They are written out by
// hand (types only from the input and layout modules) so these tests never run input or layout code.
import type { ActionState, InputFrame } from '../../input/input-frame.ts';
import type { Layout } from '../../layout/layout-types.ts';
import type { Framebuffer } from '../../render/framebuffer.ts';
import type { DrawTarget } from '../../render/draw-target.ts';
import type { FrameContext, RenderContext } from '../scene.ts';

const IDLE_ACTION: ActionState = {
  isHeld: false,
  wasPressed: false,
  wasReleased: false,
  pulses: 0,
};

/** An input frame without any input from the keyboard. */
export const IDLE_INPUT_FRAME: InputFrame = {
  actions: {
    left: IDLE_ACTION,
    right: IDLE_ACTION,
    up: IDLE_ACTION,
    down: IDLE_ACTION,
    confirm: IDLE_ACTION,
    back: IDLE_ACTION,
    pause: IDLE_ACTION,
  },
  pointer: undefined,
  releases: [],
  taps: [],
  moveTarget: undefined,
  wheelDelta: 0,
  typedChars: [],
  lastDevice: 'keyboard',
  shortcuts: [],
  hadActivity: false,
};

/**
 * A layout shaped like a 1440×900 desktop at scale 3 with side panels. The numbers are consistent
 * with each other but written by hand, not computed by the layout algorithm.
 */
export const TEST_LAYOUT: Layout = {
  kind: 'ok',
  scale: 3,
  cssPerLogical: 3,
  logical: { width: 480, height: 300 },
  canvasDevice: { width: 1440, height: 900 },
  canvasOffsetDevice: { x: 0, y: 0 },
  canvasCss: { x: 0, y: 0, width: 1440, height: 900 },
  safe: { x: 0, y: 0, width: 480, height: 300 },
  menuText: { font: 'r15k-8', zoom: 1 },
  minTouchTarget: 16,
  sizeClass: 'large',
  orientation: 'landscape',
  posture: 'flat',
  arrangement: 'sides',
  field: { x: 120, y: 20, width: 240, height: 260 },
  frame: { x: 119, y: 19, width: 242, height: 262 },
  hudBand: undefined,
  sidePanels: [
    { x: 0, y: 0, width: 116, height: 300 },
    { x: 364, y: 0, width: 116, height: 300 },
  ],
  bottomPanel: undefined,
  fieldSegment: undefined,
  segmentPanel: undefined,
  hinge: undefined,
  hudText: { font: 'r15k-5', zoom: 1 },
  isTextReadable: true,
};

/** A frame context at time 0 with idle input and no mirror events, with the given overrides. */
export function frameContext(overrides: Partial<FrameContext> = {}): FrameContext {
  return {
    input: IDLE_INPUT_FRAME,
    layout: TEST_LAYOUT,
    timeMs: 0,
    deltaSeconds: 1 / 60,
    isReducedMotion: false,
    a11yEvents: [],
    ...overrides,
  };
}

/** A framebuffer of palette slot 0 and a draw target over all of it. */
export function testTarget(width: number, height: number): DrawTarget {
  const framebuffer: Framebuffer = { width, height, pixels: new Uint8Array(width * height) };
  return { framebuffer, origin: { x: 0, y: 0 }, clip: { x: 0, y: 0, width, height } };
}

/** A render context over `target` with the given interpolation alpha. */
export function renderContext(target: DrawTarget, alpha: number): RenderContext {
  return { target, layout: TEST_LAYOUT, alpha, timeMs: 0, isReducedMotion: false };
}
