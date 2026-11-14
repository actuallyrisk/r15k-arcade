import {
  drawHLine,
  drawVLine,
  fillRect,
  SLOT,
  strokeRect,
  subTarget,
  translateRect,
} from '@r15k/engine';
import type { DrawTarget, GameModule, Rect, TextChoice } from '@r15k/engine';
import { drawFocusRing, drawLabel, UI_THEME } from '@r15k/ui';
import type { CabinetGeometry } from './hub-parts.ts';

/** Offset of the cabinet's hard shadow (as every R15K panel). */
const SHADOW_OFFSET = 3;

/** How the cabinet is drawn this frame. */
export interface CabinetDrawOptions {
  readonly game: GameModule;
  /** The game title on the marquee. */
  readonly title: string;
  readonly text: TextChoice;
  readonly timeMs: number;
  readonly isReducedMotion: boolean;
  /** Pointer down on the cabinet: no shadow, content shifted +1/+1. */
  readonly isPressed: boolean;
  readonly hasFocusRing: boolean;
}

/** The cabinet moved by an offset. */
function shifted(cabinet: CabinetGeometry, offset: number): CabinetGeometry {
  const by = { x: offset, y: offset };
  return {
    box: translateRect(cabinet.box, by),
    marquee: translateRect(cabinet.marquee, by),
    screen: translateRect(cabinet.screen, by),
    controls: translateRect(cabinet.controls, by),
  };
}

/** The control panel: a joystick on the left, two buttons on the right (procedural pixels). */
function drawControls(target: DrawTarget, controls: Rect): void {
  drawHLine(target, { x: controls.x, y: controls.y, length: controls.width, slot: SLOT.ink });
  const stickX = controls.x + Math.floor(controls.width / 4);
  fillRect(target, { x: stickX - 2, y: controls.y + 9, width: 5, height: 2 }, SLOT.ink);
  drawVLine(target, { x: stickX, y: controls.y + 5, length: 4, slot: SLOT.ink });
  fillRect(target, { x: stickX - 1, y: controls.y + 3, width: 3, height: 3 }, SLOT.pinkInk);
  strokeRect(target, { x: stickX - 1, y: controls.y + 3, width: 3, height: 3 }, SLOT.ink);
  const buttonsX = controls.x + Math.floor((controls.width * 3) / 4) - 5;
  for (const [index, slot] of [SLOT.blue, SLOT.pink].entries()) {
    const button = { x: buttonsX + index * 6, y: controls.y + 4, width: 5, height: 5 };
    fillRect(target, button, slot);
    strokeRect(target, button, SLOT.ink);
  }
}

/** Draws the arcade cabinet with the game's attract screen. */
export function drawCabinet(
  target: DrawTarget,
  geometry: CabinetGeometry,
  options: CabinetDrawOptions,
): void {
  const cabinet = options.isPressed ? shifted(geometry, 1) : geometry;
  const { box, marquee, screen } = cabinet;
  if (!options.isPressed) {
    fillRect(
      target,
      translateRect(box, { x: SHADOW_OFFSET, y: SHADOW_OFFSET }),
      UI_THEME.panelShadow,
    );
  }
  fillRect(target, box, UI_THEME.panelFill);
  strokeRect(target, box, UI_THEME.panelBorder);
  fillRect(target, marquee, SLOT.ink);
  drawLabel(target, options.title, {
    style: options.text,
    slot: SLOT.paper,
    shadowSlot: SLOT.pink,
    x: marquee.x + Math.floor(marquee.width / 2),
    y: marquee.y + 3,
    align: 'center',
  });
  options.game.drawCabinetScreen(subTarget(target, screen), {
    timeMs: options.timeMs,
    isReducedMotion: options.isReducedMotion,
  });
  strokeRect(
    target,
    { x: screen.x - 1, y: screen.y - 1, width: screen.width + 2, height: screen.height + 2 },
    SLOT.ink,
  );
  drawControls(target, cabinet.controls);
  if (options.hasFocusRing) {
    drawFocusRing(target, geometry.box);
  }
}
