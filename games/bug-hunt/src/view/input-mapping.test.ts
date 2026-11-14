import { describe, expect, test } from 'vitest';
import { roundHudPlacement } from './hud-placement.ts';
import { mapRoundInput, steeringOrigin } from './input-mapping.ts';
import {
  BOOK_VIEWPORT,
  inputFrame,
  layoutOf,
  pointerAt,
  referenceLayout,
  withPressed,
} from './test-support/round-fixtures.ts';

const PHONE = referenceLayout('phone-portrait');
const PHONE_HUD = roundHudPlacement(PHONE);
const SIDES = referenceLayout('phone-landscape');
const SIDES_HUD = roundHudPlacement(SIDES);

/** Centre of a rect. */
function centre(rect: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}): {
  readonly x: number;
  readonly y: number;
} {
  return { x: rect.x + Math.floor(rect.width / 2), y: rect.y + Math.floor(rect.height / 2) };
}

describe('keys and gamepad', () => {
  test('exactly one of left and right moves, both or none stand still', () => {
    expect(mapRoundInput(withPressed(inputFrame(), ['left']), PHONE, PHONE_HUD)).toEqual({
      move: -1,
      aimX: undefined,
    });
    expect(mapRoundInput(withPressed(inputFrame(), ['right']), PHONE, PHONE_HUD).move).toBe(1);
    expect(mapRoundInput(withPressed(inputFrame(), ['left', 'right']), PHONE, PHONE_HUD).move).toBe(
      0,
    );
    expect(mapRoundInput(inputFrame(), PHONE, PHONE_HUD).move).toBe(0);
  });
});

describe('steeringOrigin', () => {
  test('classifies control, hold areas, follow and off-canvas points', () => {
    const [left, right] = SIDES.sidePanels ?? [SIDES.safe, SIDES.safe];
    expect(steeringOrigin(centre(SIDES_HUD.pauseHit), SIDES, SIDES_HUD)).toBe('control');
    expect(steeringOrigin(centre(left), SIDES, SIDES_HUD)).toBe('hold-left');
    expect(steeringOrigin({ x: right.x + 1, y: right.y + 1 }, SIDES, SIDES_HUD)).toBe('hold-right');
    expect(steeringOrigin(centre(SIDES.field), SIDES, SIDES_HUD)).toBe('follow');
    expect(steeringOrigin({ x: -1, y: 5 }, SIDES, SIDES_HUD)).toBe('none');
    expect(steeringOrigin({ x: 1, y: 1 }, PHONE, PHONE_HUD)).toBe('follow');
  });
});

describe('touch', () => {
  const field = PHONE.field;

  test('a press in the field aims the cat centre under the finger, clamped to the field', () => {
    const at = { x: field.x + 100, y: field.y + 50 };
    const frame = inputFrame({ pointer: pointerAt(at), moveTarget: at.x });
    expect(mapRoundInput(frame, PHONE, PHONE_HUD)).toEqual({ move: 0, aimX: 88 });
    const edge = { x: field.x + 2, y: field.y + 50 };
    expect(
      mapRoundInput(inputFrame({ pointer: pointerAt(edge), moveTarget: edge.x }), PHONE, PHONE_HUD)
        .aimX,
    ).toBe(0);
    const far = { x: field.x + 239, y: field.y + 50 };
    expect(
      mapRoundInput(inputFrame({ pointer: pointerAt(far), moveTarget: far.x }), PHONE, PHONE_HUD)
        .aimX,
    ).toBe(216);
  });

  test('a touch pressed and released within one frame still aims', () => {
    const at = { x: field.x + 30, y: field.y + 300 };
    const pointer = pointerAt(at, { isDown: false, wasPressed: true, wasReleased: true });
    expect(mapRoundInput(inputFrame({ pointer, moveTarget: at.x }), PHONE, PHONE_HUD).aimX).toBe(
      18,
    );
  });

  test('a press on the pause button never aims, also when released in the same frame', () => {
    const at = centre(PHONE_HUD.pauseHit);
    const held = inputFrame({ pointer: pointerAt(at), moveTarget: at.x });
    expect(mapRoundInput(held, PHONE, PHONE_HUD)).toEqual({ move: 0, aimX: undefined });
    const tapped = inputFrame({
      pointer: pointerAt(at, { isDown: false, wasReleased: true }),
      moveTarget: at.x,
    });
    expect(mapRoundInput(tapped, PHONE, PHONE_HUD).aimX).toBeUndefined();
  });
});

describe('touch drags and panels', () => {
  const field = PHONE.field;

  test('a drag that started on the pause button and moved onto the field never steers', () => {
    const start = centre(PHONE_HUD.pauseHit);
    const pointer = pointerAt(
      { x: field.x + 50, y: field.y + 50 },
      { downPosition: start, wasPressed: false },
    );
    expect(
      mapRoundInput(inputFrame({ pointer, moveTarget: field.x + 50 }), PHONE, PHONE_HUD).aimX,
    ).toBeUndefined();
  });

  test('the bottom panel and the band follow the finger', () => {
    const inPanel = { x: field.x + 12, y: (PHONE.bottomPanel?.y ?? 0) + 5 };
    expect(
      mapRoundInput(
        inputFrame({ pointer: pointerAt(inPanel), moveTarget: inPanel.x }),
        PHONE,
        PHONE_HUD,
      ).aimX,
    ).toBe(0);
    const onBand = { x: field.x + 120, y: (PHONE.hudBand?.y ?? 0) + 2 };
    expect(
      mapRoundInput(
        inputFrame({ pointer: pointerAt(onBand), moveTarget: onBand.x }),
        PHONE,
        PHONE_HUD,
      ).aimX,
    ).toBe(108);
  });

  test('no aim without a move target', () => {
    const at = { x: field.x + 100, y: field.y + 50 };
    expect(
      mapRoundInput(inputFrame({ pointer: pointerAt(at, { wasPressed: false }) }), PHONE, PHONE_HUD)
        .aimX,
    ).toBeUndefined();
  });
});

describe('hold areas', () => {
  test('sides: holding the left or right panel moves at keyboard speed, keys win', () => {
    const [left, right] = SIDES.sidePanels ?? [SIDES.safe, SIDES.safe];
    const holdLeft = inputFrame({
      pointer: pointerAt({ x: left.x + 2, y: left.y + 2 }),
      moveTarget: left.x + 2,
    });
    expect(mapRoundInput(holdLeft, SIDES, SIDES_HUD)).toEqual({ move: -1, aimX: undefined });
    const holdRight = inputFrame({ pointer: pointerAt({ x: right.x + 2, y: right.y + 2 }) });
    expect(mapRoundInput(holdRight, SIDES, SIDES_HUD).move).toBe(1);
    expect(mapRoundInput(withPressed(holdRight, ['left']), SIDES, SIDES_HUD).move).toBe(-1);
    const released = inputFrame({
      pointer: pointerAt({ x: right.x + 2, y: right.y + 2 }, { isDown: false }),
    });
    expect(mapRoundInput(released, SIDES, SIDES_HUD).move).toBe(0);
  });

  test('book: the halves of the segment panel are hold areas', () => {
    const layout = layoutOf(BOOK_VIEWPORT);
    const placement = roundHudPlacement(layout);
    const segment = layout.segmentPanel ?? layout.safe;
    const leftHalf = inputFrame({ pointer: pointerAt({ x: segment.x + 5, y: segment.y + 5 }) });
    expect(mapRoundInput(leftHalf, layout, placement).move).toBe(-1);
    const rightHalf = inputFrame({
      pointer: pointerAt({ x: segment.x + segment.width - 5, y: segment.y + 5 }),
    });
    expect(mapRoundInput(rightHalf, layout, placement).move).toBe(1);
  });
});

describe('mouse', () => {
  const field = SIDES.field;

  test('hovering over the field aims, over the right side panel it does not', () => {
    const over = { x: field.x + 120, y: field.y + 20 };
    const hover = pointerAt(over, {
      kind: 'mouse',
      downPosition: undefined,
      isDown: false,
      wasPressed: false,
    });
    expect(
      mapRoundInput(inputFrame({ pointer: hover, moveTarget: over.x }), SIDES, SIDES_HUD).aimX,
    ).toBe(108);
    const [, right] = SIDES.sidePanels ?? [SIDES.safe, SIDES.safe];
    const side = { x: right.x + 5, y: right.y + 5 };
    const onPanel = pointerAt(side, {
      kind: 'mouse',
      downPosition: undefined,
      isDown: false,
      wasPressed: false,
    });
    expect(
      mapRoundInput(inputFrame({ pointer: onPanel, moveTarget: side.x }), SIDES, SIDES_HUD).aimX,
    ).toBeUndefined();
  });

  test('a mouse press on the pause button never steers', () => {
    const at = centre(SIDES_HUD.pauseHit);
    const press = pointerAt(at, { kind: 'mouse' });
    expect(
      mapRoundInput(inputFrame({ pointer: press, moveTarget: at.x }), SIDES, SIDES_HUD),
    ).toEqual({ move: 0, aimX: undefined });
  });
});

describe('mouse drags', () => {
  const field = SIDES.field;

  test('a mouse drag that started in the field aims while inside the steering region', () => {
    const start = { x: field.x + 10, y: field.y + 10 };
    const drag = pointerAt(
      { x: field.x + 60, y: field.y + 30 },
      { kind: 'mouse', downPosition: start, wasPressed: false },
    );
    expect(
      mapRoundInput(inputFrame({ pointer: drag, moveTarget: field.x + 60 }), SIDES, SIDES_HUD).aimX,
    ).toBe(48);
  });
});
