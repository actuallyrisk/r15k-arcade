import { SLOT, validateSpriteSheet } from '@r15k/engine';
import type { CompiledSprite } from '@r15k/engine';
import { describe, expect, test } from 'vitest';
import { TUNING } from '../content/tuning.ts';
import { createInitialState } from '../sim/create.ts';
import { CAT_SPRITE_SHEET } from '../sprites/cat.ts';
import { ITEM_SPRITE_SHEET } from '../sprites/items.ts';
import { getHurtRemap, selectCatFrame } from './cat-animation.ts';
import { getBugHuntSprites } from './sprite-sheets.ts';

/** Opaque mask of a frame: 1 where the pixel is drawn. */
function mask(frame: Uint8Array | undefined): string {
  return Array.from(frame ?? [], (slot) => (slot === SLOT.transparent ? '0' : '1')).join('');
}

/** Whether a sprite frame has an opaque pixel in its last row. */
function touchesBottom(sprite: CompiledSprite, frame: number): boolean {
  const data = sprite.frames[frame] ?? new Uint8Array(0);
  return data
    .subarray((sprite.height - 1) * sprite.width)
    .some((slot) => slot !== SLOT.transparent);
}

describe('sprite sheets', () => {
  test('both sheets are valid and have the sizes and frame counts of the game', () => {
    expect(validateSpriteSheet(CAT_SPRITE_SHEET)).toEqual([]);
    expect(validateSpriteSheet(ITEM_SPRITE_SHEET)).toEqual([]);
    const { cat, items } = getBugHuntSprites();
    const sizes = [
      cat['cat-sit'],
      cat['cat-run'],
      cat['cat-happy'],
      cat['cat-startle'],
      items.bug,
      items['golden-bug'],
      items.bomb,
    ].map((sprite) => `${sprite.name} ${sprite.width}×${sprite.height}×${sprite.frames.length}`);
    expect(sizes).toEqual([
      'cat-sit 24×24×1',
      'cat-run 24×24×4',
      'cat-happy 24×24×1',
      'cat-startle 24×24×1',
      'bug 11×11×2',
      'golden-bug 11×11×2',
      'bomb 11×12×2',
    ]);
    expect(cat['cat-sit'].width).toBe(TUNING.cat.width);
    expect(items.bug.width).toBe(TUNING.item.width);
  });

  test('compiled once', () => {
    expect(getBugHuntSprites()).toBe(getBugHuntSprites());
  });
});

describe('sprite shapes', () => {
  test('every cat frame stands on the last row (the cat touches the ground line)', () => {
    const { cat } = getBugHuntSprites();
    for (const sprite of [cat['cat-sit'], cat['cat-run'], cat['cat-happy'], cat['cat-startle']]) {
      sprite.frames.forEach((_, frame) => {
        expect(touchesBottom(sprite, frame)).toBe(true);
      });
    }
  });

  test('the golden bug differs from the bug by shape, not only by colour', () => {
    const { items } = getBugHuntSprites();
    expect(mask(items['golden-bug'].frames[0])).not.toBe(mask(items.bug.frames[0]));
    expect(mask(items['golden-bug'].frames[1])).not.toBe(mask(items.bug.frames[1]));
  });

  test('the run frames all differ (a smooth four-step cycle)', () => {
    const run = getBugHuntSprites().cat['cat-run'];
    const masks = new Set(run.frames.map((frame) => Array.from(frame).join(',')));
    expect(masks.size).toBe(4);
  });
});

describe('selectCatFrame', () => {
  const cat = createInitialState({ seed: 1, mode: 'arcade' }).cat;

  test('sits by default, is happy after a catch', () => {
    expect(selectCatFrame(cat, false)).toEqual({
      sprite: 'cat-sit',
      frame: 0,
      isMirrored: false,
      isHurt: false,
    });
    expect(selectCatFrame({ ...cat, happySeconds: 0.1 }, false).sprite).toBe('cat-happy');
  });

  test('runs through four frames, mirrored when facing left; one frame with reduced motion', () => {
    const running = { ...cat, isMoving: true, moveSeconds: 0.25, facing: -1 as const };
    expect(selectCatFrame(running, false)).toEqual({
      sprite: 'cat-run',
      frame: 2,
      isMirrored: true,
      isHurt: false,
    });
    expect(selectCatFrame({ ...running, moveSeconds: 0.45 }, false).frame).toBe(0);
    expect(selectCatFrame(running, true).frame).toBe(0);
    expect(selectCatFrame({ ...running, facing: 1 }, false).isMirrored).toBe(false);
  });

  test('a startle wins over running and happy and uses the hurt colours', () => {
    const startled = { ...cat, startleSeconds: 0.3, isMoving: true, happySeconds: 0.2 };
    expect(selectCatFrame(startled, false)).toEqual({
      sprite: 'cat-startle',
      frame: 0,
      isMirrored: false,
      isHurt: true,
    });
    const remap = getHurtRemap();
    expect([remap[SLOT.paper], remap[SLOT.pink], remap[SLOT.ink]]).toEqual([
      SLOT.pink,
      SLOT.blue,
      SLOT.ink,
    ]);
  });
});
