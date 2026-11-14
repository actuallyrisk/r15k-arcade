import { createRemap } from '@r15k/engine';
import type { SlotRemap } from '@r15k/engine';
import { TUNING } from '../content/tuning.ts';
import type { Cat } from '../sim/state.ts';

/** Run frames of the cat sprite. */
const RUN_FRAMES = 4;

/** The cat sprite to draw and how. */
export interface CatFrame {
  readonly sprite: 'cat-sit' | 'cat-run' | 'cat-happy' | 'cat-startle';
  readonly frame: number;
  /** Sprites face right; running left mirrors them. */
  readonly isMirrored: boolean;
  /** Drawn with the hurt remap (paper → pink, pink → blue). */
  readonly isHurt: boolean;
}

/**
 * The cat frame for a cat state: startled (hurt colours) after a bomb, else running (one run frame
 * with reduced motion, mirrored when facing left), else happy after a catch, else sitting.
 */
export function selectCatFrame(cat: Cat, isReducedMotion: boolean): CatFrame {
  if (cat.startleSeconds > 0) {
    return { sprite: 'cat-startle', frame: 0, isMirrored: false, isHurt: true };
  }
  if (cat.isMoving) {
    const frame = isReducedMotion
      ? 0
      : Math.floor(cat.moveSeconds / TUNING.view.runFrameSeconds) % RUN_FRAMES;
    return { sprite: 'cat-run', frame, isMirrored: cat.facing === -1, isHurt: false };
  }
  if (cat.happySeconds > 0) {
    return { sprite: 'cat-happy', frame: 0, isMirrored: false, isHurt: false };
  }
  return { sprite: 'cat-sit', frame: 0, isMirrored: false, isHurt: false };
}

let hurtRemap: SlotRemap | undefined;

/** The hurt colours of the startled cat (as the original's hurt palette): paper → pink, pink → blue. */
export function getHurtRemap(): SlotRemap {
  hurtRemap ??= createRemap({ paper: 'pink', pink: 'blue' });
  return hurtRemap;
}
