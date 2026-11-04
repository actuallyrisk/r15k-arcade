// Framebuffer helpers for the render tests: pixels as text rows ('.' paper, '#' ink, other slots as
// one character each) and small framebuffers filled with paper.
import { createDrawTarget } from '../draw-target.ts';
import type { DrawTarget } from '../draw-target.ts';
import { createFramebuffer } from '../framebuffer.ts';

/** Character per slot index: 0 '_', 1 (paper) '.', 2 (ink) '#', 3–9 digits, 10–17 'a'–'h'. */
const SLOT_CHARS = '_.#3456789abcdefgh';

/** The framebuffer of a target as one string per row. */
export function pixelRows(target: DrawTarget): string[] {
  const { width, height, pixels } = target.framebuffer;
  return Array.from({ length: height }, (_, row) =>
    Array.from(
      pixels.subarray(row * width, (row + 1) * width),
      (slot) => SLOT_CHARS[slot] ?? '?',
    ).join(''),
  );
}

/** A target on a fresh paper-filled framebuffer. */
export function paperTarget(width: number, height: number): DrawTarget {
  return createDrawTarget(createFramebuffer({ width, height }));
}
