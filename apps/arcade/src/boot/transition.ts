import { SLOT } from '@r15k/engine';
import type { DrawTarget } from '@r15k/engine';

/** Length of each half of a dissolve (out, then in) in seconds. */
const HALF_SECONDS = 0.25;

/** Weight of the ordered-dither threshold; the rest is a diagonal sweep from the top left. */
const DITHER_WEIGHT = 0.55;

/** The 8×8 Bayer matrix (values 0…63). */
const BAYER8: readonly (readonly number[])[] = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

/** A full-screen dissolve that lives in the frame driver, not on the scene stack. */
export interface TransitionDriver {
  /** Dissolve out 0.25 s, run `midpoint` (the stack operation), dissolve in 0.25 s. */
  start(midpoint: () => void): void;
  /** Advances the dissolve by one frame's real time. */
  advance(deltaSeconds: number): void;
  readonly isActive: boolean;
  /** Paints the covered pixels in paper (ordered dither with a diagonal sweep). */
  draw(target: DrawTarget): void;
}

/** The dissolve threshold of one pixel: 0…1, lower pixels are covered first. */
function threshold(
  x: number,
  y: number,
  size: { readonly width: number; readonly height: number },
): number {
  const dither = ((BAYER8[y % 8]?.[x % 8] ?? 0) + 0.5) / 64;
  const sweep = (x / size.width + y / size.height) / 2;
  return DITHER_WEIGHT * dither + (1 - DITHER_WEIGHT) * sweep;
}

/** Paints every pixel whose threshold is below `coverage` in paper. */
function paintCoverage(target: DrawTarget, coverage: number): void {
  const { framebuffer, clip } = target;
  const size = { width: framebuffer.width, height: framebuffer.height };
  for (let y = clip.y; y < clip.y + clip.height; y += 1) {
    const row = y * framebuffer.width;
    for (let x = clip.x; x < clip.x + clip.width; x += 1) {
      if (threshold(x, y, size) < coverage) {
        framebuffer.pixels[row + x] = SLOT.paper;
      }
    }
  }
}

/** The dissolve: out, the stack operation at full cover, then in. */
class Dissolve implements TransitionDriver {
  private readonly isReducedMotion: () => boolean;
  private elapsed = 0;
  private midpoint: (() => void) | undefined;
  private isRunning = false;

  constructor(isReducedMotion: () => boolean) {
    this.isReducedMotion = isReducedMotion;
  }

  get isActive(): boolean {
    return this.isRunning;
  }

  start(midpoint: () => void): void {
    if (this.isReducedMotion()) {
      midpoint();
      return;
    }
    this.runMidpoint();
    this.midpoint = midpoint;
    this.elapsed = 0;
    this.isRunning = true;
  }

  advance(deltaSeconds: number): void {
    if (!this.isRunning) {
      return;
    }
    this.elapsed += deltaSeconds;
    if (this.elapsed >= HALF_SECONDS) {
      this.runMidpoint();
    }
    this.isRunning = this.elapsed < 2 * HALF_SECONDS;
  }

  draw(target: DrawTarget): void {
    if (!this.isRunning) {
      return;
    }
    const progress = this.elapsed / HALF_SECONDS;
    paintCoverage(target, progress < 1 ? progress : 2 - progress);
  }

  /** Runs the pending stack operation once. */
  private runMidpoint(): void {
    const pending = this.midpoint;
    this.midpoint = undefined;
    pending?.();
  }
}

/** Creates the dissolve driver; with reduced motion `start()` runs the midpoint at once (a cut). */
export function createTransitionDriver(options: {
  readonly isReducedMotion: () => boolean;
}): TransitionDriver {
  return new Dissolve(options.isReducedMotion);
}
