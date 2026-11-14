import { createDrawTarget, createFramebuffer, SLOT } from '@r15k/engine';
import { expect, test, vi } from 'vitest';
import { createTransitionDriver } from './transition.ts';

/** A target filled with ink. */
function inkTarget(size: number): ReturnType<typeof createDrawTarget> {
  const target = createDrawTarget(createFramebuffer({ width: size, height: size }));
  target.framebuffer.pixels.fill(SLOT.ink);
  return target;
}

test('the dissolve runs the midpoint once at full cover and ends after 0.5 s', () => {
  const midpoint = vi.fn();
  const driver = createTransitionDriver({ isReducedMotion: () => false });
  driver.start(midpoint);
  expect(driver.isActive).toBe(true);
  driver.advance(0.2);
  expect(midpoint).not.toHaveBeenCalled();
  driver.advance(0.05);
  expect(midpoint).toHaveBeenCalledOnce();
  const target = inkTarget(16);
  driver.draw(target);
  expect(target.framebuffer.pixels.every((slot) => slot === SLOT.paper)).toBe(true);
  driver.advance(0.25);
  expect(driver.isActive).toBe(false);
  expect(midpoint).toHaveBeenCalledOnce();
});

test('half way out, part of the screen is covered', () => {
  const driver = createTransitionDriver({ isReducedMotion: () => false });
  driver.start(vi.fn());
  driver.advance(0.125);
  const target = inkTarget(32);
  driver.draw(target);
  const covered = target.framebuffer.pixels.filter((slot) => slot === SLOT.paper).length;
  expect(covered).toBeGreaterThan(0);
  expect(covered).toBeLessThan(32 * 32);
});

test('reduced motion cuts; a new start runs a pending midpoint first', () => {
  const cut = vi.fn();
  createTransitionDriver({ isReducedMotion: () => true }).start(cut);
  expect(cut).toHaveBeenCalledOnce();
  const first = vi.fn();
  const driver = createTransitionDriver({ isReducedMotion: () => false });
  driver.start(first);
  driver.start(vi.fn());
  expect(first).toHaveBeenCalledOnce();
});
