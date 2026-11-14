import { clamp, rectContains } from '@r15k/engine';
import type { InputFrame, Layout, Point, PointerSnapshot } from '@r15k/engine';
import { TUNING } from '../content/tuning.ts';
import { CAT_MAX_X } from '../sim/derived.ts';
import type { HudPlacement } from './hud-placement.ts';

/** What a pointer press steers, decided by where it started. */
export type SteeringOrigin = 'control' | 'follow' | 'hold-left' | 'hold-right' | 'none';

/** The round input of one frame: held direction and a new pointer aim (cat left x). */
export interface MappedInput {
  readonly move: -1 | 0 | 1;
  readonly aimX: number | undefined;
}

/**
 * Classifies a press position: on the pause button (or another control) it never steers; on a hold
 * area it moves the cat at keyboard speed; anywhere else on the canvas the cat follows the pointer.
 */
export function steeringOrigin(
  point: Point,
  layout: Layout,
  placement: HudPlacement,
): SteeringOrigin {
  const canvas = { x: 0, y: 0, width: layout.logical.width, height: layout.logical.height };
  if (!rectContains(canvas, point)) {
    return 'none';
  }
  if (rectContains(placement.pauseHit, point)) {
    return 'control';
  }
  const holds = placement.holdAreas;
  if (holds !== undefined && rectContains(holds[0], point)) {
    return 'hold-left';
  }
  if (holds !== undefined && rectContains(holds[1], point)) {
    return 'hold-right';
  }
  return 'follow';
}

/** Held keyboard or gamepad direction: exactly one of left and right. */
function keyMove(frame: InputFrame): -1 | 0 | 1 {
  const isLeft = frame.actions.left.isHeld;
  if (isLeft === frame.actions.right.isHeld) {
    return 0;
  }
  return isLeft ? -1 : 1;
}

/**
 * The mouse steering region: the field's columns from the frame top to the canvas bottom, plus the
 * bottom and segment panels, never over a control.
 */
function isInMouseRegion(point: Point, layout: Layout, placement: HudPlacement): boolean {
  if (rectContains(placement.pauseHit, point)) {
    return false;
  }
  const column = {
    x: layout.field.x,
    y: layout.frame.y,
    width: layout.field.width,
    height: layout.logical.height - layout.frame.y,
  };
  const panels = [layout.bottomPanel, layout.segmentPanel];
  return (
    rectContains(column, point) ||
    panels.some((panel) => panel !== undefined && rectContains(panel, point))
  );
}

/** Direction of a hold area press. */
function holdDirection(origin: SteeringOrigin): -1 | 0 | 1 {
  if (origin === 'hold-left') {
    return -1;
  }
  return origin === 'hold-right' ? 1 : 0;
}

/** Cat left x that puts the cat's centre under the pointer, clamped to the field. */
function aimUnder(x: number, layout: Layout): number {
  return clamp(Math.floor(x - layout.field.x - TUNING.cat.width / 2), 0, CAT_MAX_X);
}

/** The aim of the steering pointer this frame, if it may steer. */
function pointerAim(
  frame: InputFrame,
  pointer: PointerSnapshot,
  context: {
    readonly origin: SteeringOrigin;
    readonly layout: Layout;
    readonly placement: HudPlacement;
  },
): number | undefined {
  if (frame.moveTarget === undefined) {
    return undefined;
  }
  const { origin, layout, placement } = context;
  if (pointer.kind === 'mouse') {
    const isSteering = origin === 'none' || origin === 'follow';
    return isSteering && isInMouseRegion(pointer.position, layout, placement)
      ? aimUnder(pointer.position.x, layout)
      : undefined;
  }
  const isActive = pointer.isDown || pointer.wasPressed;
  return origin === 'follow' && isActive ? aimUnder(pointer.position.x, layout) : undefined;
}

/**
 * Maps one input frame to the round input: keys and gamepad give `move`; the steering pointer is
 * classified by its press position (control, hold area or follow) and gives either a hold `move` or an
 * `aimX`. Key and gamepad movement wins over a hold.
 */
export function mapRoundInput(
  frame: InputFrame,
  layout: Layout,
  placement: HudPlacement,
): MappedInput {
  const move = keyMove(frame);
  const pointer = frame.pointer;
  if (pointer === undefined) {
    return { move, aimX: undefined };
  }
  const origin =
    pointer.downPosition === undefined
      ? 'none'
      : steeringOrigin(pointer.downPosition, layout, placement);
  const holdMove = pointer.isDown ? holdDirection(origin) : 0;
  return {
    move: move === 0 ? holdMove : move,
    aimX: pointerAim(frame, pointer, { origin, layout, placement }),
  };
}
