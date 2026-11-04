import { expect, test } from 'vitest';
import { blitSprite } from './blit.ts';
import { subTarget } from './draw-target.ts';
import { createRemap } from './remap.ts';
import { compileSpriteSheet } from './sprite.ts';
import { paperTarget, pixelRows } from './test-support/pixels.ts';

const SPRITES = compileSpriteSheet({
  id: 'blit-test',
  sprites: {
    flag: {
      width: 3,
      height: 2,
      frames: [
        ['oo.', 'ob.'],
        ['g..', 'gg.'],
        ['bbb', 'bbb'],
      ],
    },
  },
});
const FLAG = SPRITES.flag;

test('a frame is drawn at its position and transparent pixels keep the background', () => {
  const target = paperTarget(5, 3);
  blitSprite(target, FLAG, { x: 1.7, y: 1 });
  expect(pixelRows(target)).toEqual(['.....', '.##..', '.#3..']);
});

test('frames wrap in both directions and mirroring flips rows', () => {
  const target = paperTarget(8, 2);
  blitSprite(target, FLAG, { x: 0, y: 0, frame: 4 });
  blitSprite(target, FLAG, { x: 5, y: 0, isMirrored: true, frame: -3 });
  expect(pixelRows(target)).toEqual(['9.....##', '99....3#']);
});

test('a remap replaces slots, and a slot remapped to transparent is skipped', () => {
  const target = paperTarget(3, 2);
  target.framebuffer.pixels.fill(6);
  blitSprite(target, FLAG, { x: 0, y: 0, remap: createRemap({ ink: 'gold', blue: 'paper' }) });
  expect(pixelRows(target)).toEqual(['996', '9.6']);
  const hide = Uint8Array.from({ length: 256 }, (_, slot) => (slot === 2 ? 0 : slot));
  blitSprite(target, FLAG, { x: 0, y: 0, remap: hide });
  expect(pixelRows(target)).toEqual(['996', '936']);
});

test('a short remap keeps the slots it does not cover', () => {
  const target = paperTarget(3, 2);
  blitSprite(target, FLAG, { x: 0, y: 0, remap: Uint8Array.from([0, 1, 9]) });
  expect(pixelRows(target)).toEqual(['99.', '93.']);
});

test('blitting clips at every edge and inside sub-targets', () => {
  const target = paperTarget(4, 3);
  blitSprite(target, FLAG, { x: -1, y: -1 });
  blitSprite(target, FLAG, { x: 3, y: 2 });
  const panel = subTarget(target, { x: 1, y: 1, width: 2, height: 1 });
  blitSprite(panel, FLAG, { x: 0, y: 0, frame: 2 });
  blitSprite(target, FLAG, { x: 10, y: 10 });
  expect(pixelRows(target)).toEqual(['3...', '.33.', '...#']);
});
