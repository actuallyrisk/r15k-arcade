import { blitSprite } from '@r15k/engine';
import type { CabinetScreenOptions, DrawTarget } from '@r15k/engine';
import { drawGridPaper } from '@r15k/ui';
import { TUNING } from '../content/tuning.ts';
import { drawGround } from './playfield.ts';
import { getBugHuntSprites } from './sprite-sheets.ts';

/**
 * The three bugs of the attract frame: horizontal position as a fraction of the screen width (left
 * edge), fall progress from the screen top to the ground, and a wiggle phase in frames.
 */
const PREVIEW_BUGS = [
  { column: 0.12, fall: 0.62, phase: 0 },
  { column: 0.5, fall: 0.3, phase: 1 },
  { column: 0.74, fall: 0.46, phase: 0 },
] as const;

/** Milliseconds per second (the cabinet clock is in milliseconds). */
const MS_PER_SECOND = 1000;

/**
 * The hub cabinet's attract frame: grid paper, ground, the sitting cat in the middle and three bugs at
 * fixed fall positions, wiggling unless reduced motion. Drawn 1:1 into any screen of at least 64×48:
 * the ground keeps the field's proportion (at most its full height), the cat is centred on it.
 */
export function drawCabinetPreview(target: DrawTarget, options: CabinetScreenOptions): void {
  const width = target.clip.width;
  const height = target.clip.height;
  const area = {
    x: target.clip.x - target.origin.x,
    y: target.clip.y - target.origin.y,
    width,
    height,
  };
  drawGridPaper(target, area, { origin: { x: area.x, y: area.y } });
  const groundHeight = Math.min(
    TUNING.ground.height,
    Math.floor((height * TUNING.ground.height) / TUNING.field.minHeight),
  );
  const groundY = area.y + height - groundHeight;
  drawGround(target, area, groundY);
  const sprites = getBugHuntSprites();
  const cat = sprites.cat['cat-sit'];
  blitSprite(target, cat, {
    x: area.x + Math.floor((width - cat.width) / 2),
    y: groundY - cat.height,
  });
  const bug = sprites.items.bug;
  const wiggle = options.isReducedMotion
    ? 0
    : Math.floor(options.timeMs / MS_PER_SECOND / TUNING.view.itemFrameSeconds);
  for (const entry of PREVIEW_BUGS) {
    blitSprite(target, bug, {
      x: area.x + Math.floor(width * entry.column),
      y: area.y + Math.round(entry.fall * (groundY - area.y)) - bug.height,
      frame: options.isReducedMotion ? 0 : wiggle + entry.phase,
    });
  }
}
