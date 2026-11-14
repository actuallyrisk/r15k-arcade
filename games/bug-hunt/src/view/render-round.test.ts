import { createDrawTarget, createFramebuffer, SLOT, subTarget } from '@r15k/engine';
import type { DrawTarget, Layout, Translator } from '@r15k/engine';
import { describe, expect, test } from 'vitest';
import { BUG_HUNT_GAME } from './game-module.ts';
import { groundLineY } from './item-mapping.ts';
import { renderRound } from './render-round.ts';
import type { RoundRenderInput } from './render-round.ts';
import { advanceRoundView, createRoundViewState } from './round-view-state.ts';
import {
  allLayouts,
  botRound,
  referenceLayout,
  translator,
} from './test-support/round-fixtures.ts';

/** A frame of the bot round of seed 1 at a tick, with the view built from every step. */
function roundAt(layout: Layout, ticks: number, i18n: Translator = translator()): RoundRenderInput {
  const { state, steps } = botRound(1, ticks);
  const view = steps.reduce(
    (current, events) => advanceRoundView(current, { events, dt: 1 / 120, isReducedMotion: false }),
    createRoundViewState(1),
  );
  return {
    layout,
    previous: state,
    current: state,
    alpha: 0,
    view,
    bestScore: 12,
    i18n,
    lastDevice: 'touch',
    isReducedMotion: false,
  };
}

/** Renders into a fresh framebuffer of the layout's size. */
function render(input: RoundRenderInput): DrawTarget {
  const target = createDrawTarget(createFramebuffer(input.layout.logical));
  renderRound(target, input);
  return target;
}

describe('renderRound', () => {
  test.each(allLayouts())('$name: draws a running round', ({ layout }) => {
    const target = render(roundAt(layout, 1500));
    expect(target.framebuffer.pixels.includes(SLOT.ink)).toBe(true);
  });

  test('renders the same frame at any alpha while previous equals current', () => {
    const input = roundAt(referenceLayout('phone-portrait'), 900);
    expect(render({ ...input, alpha: 0.9 }).framebuffer.pixels).toEqual(
      render(input).framebuffer.pixels,
    );
  });

  test('the sitting cat stands on the ground line', () => {
    const layout = referenceLayout('desktop');
    const input = roundAt(layout, 10);
    const target = render(input);
    const row = groundLineY(layout) - 1;
    const catX = layout.field.x + Math.round(input.current.cat.x);
    const pixels = target.framebuffer.pixels.subarray(
      row * layout.logical.width + catX,
      row * layout.logical.width + catX + 24,
    );
    expect(pixels.includes(SLOT.ink)).toBe(true);
  });
});

describe('renderRound texts and motion', () => {
  test('popup texts are formatted at render time in both locales', () => {
    for (const locale of ['en', 'de'] as const) {
      const calls: string[] = [];
      const base = translator(locale);
      const spy: Translator = {
        ...base,
        t: (key, params) => {
          calls.push(`${key} ${JSON.stringify(params ?? {})}`);
          return base.t(key, params);
        },
      };
      const input = roundAt(referenceLayout('phone-portrait'), 1, spy);
      const view = {
        ...input.view,
        popups: [
          { kind: 'points' as const, value: 5, slot: SLOT.gold, x: 100, ageSeconds: 0.1 },
          { kind: 'penalty' as const, value: 3, slot: SLOT.pinkInk, x: 20, ageSeconds: 0.2 },
        ],
      };
      render({ ...input, view });
      expect(calls).toContain('bugHunt.popup.points {"value":5}');
      expect(calls).toContain('bugHunt.popup.penalty {"value":3}');
    }
  });

  test('reduced motion draws no shake', () => {
    const input = roundAt(referenceLayout('phone-landscape'), 400);
    const shaking = { ...input, view: { ...input.view, shakeSeconds: 0.2 }, isReducedMotion: true };
    const still = { ...input, view: { ...input.view, shakeSeconds: 0 }, isReducedMotion: true };
    expect(render(shaking).framebuffer.pixels).toEqual(render(still).framebuffer.pixels);
  });
});

describe('drawCabinetScreen', () => {
  test.each([
    [64, 48],
    [96, 72],
    [192, 144],
  ])('draws %i×%i inside its rect only', (width, height) => {
    const target = createDrawTarget(createFramebuffer({ width: width + 20, height: height + 20 }));
    target.framebuffer.pixels.fill(0);
    BUG_HUNT_GAME.drawCabinetScreen(subTarget(target, { x: 10, y: 10, width, height }), {
      timeMs: 0,
      isReducedMotion: false,
    });
    const { pixels } = target.framebuffer;
    const stride = width + 20;
    expect(pixels[9 * stride + 9]).toBe(0);
    expect(pixels[(height + 10) * stride + width + 10]).toBe(0);
    expect(pixels[10 * stride + 10]).not.toBe(0);
    expect(pixels.includes(SLOT.blue)).toBe(true);
  });

  test('the bugs wiggle over time unless reduced motion', () => {
    const draw = (timeMs: number, isReducedMotion: boolean): Uint8Array => {
      const target = createDrawTarget(createFramebuffer({ width: 96, height: 72 }));
      BUG_HUNT_GAME.drawCabinetScreen(target, { timeMs, isReducedMotion });
      return target.framebuffer.pixels;
    };
    expect(draw(0, false)).not.toEqual(draw(250, false));
    expect(draw(0, true)).toEqual(draw(250, true));
  });
});
