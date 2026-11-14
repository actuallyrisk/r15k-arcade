import { describe, expect, test } from 'vitest';
import { TUNING } from '../content/tuning.ts';
import { capHeightOf, roundTextStyle } from './text-styles.ts';
import type { RoundTextRole } from './text-styles.ts';
import { allLayouts, referenceLayout } from './test-support/round-fixtures.ts';

const HUD_ROLES: readonly RoundTextRole[] = ['hud-label', 'hud-value', 'hud-value-large', 'popup'];
const MENU_ROLES: readonly RoundTextRole[] = [
  'hint',
  'countdown-label',
  'countdown-digit',
  'banner',
];
/** Text widths to try for the roles that grow when they fit (narrow and wide). */
const FIT_WIDTHS = [undefined, 10, 400] as const;

describe('roundTextStyle minimum sizes', () => {
  test.each(allLayouts())(
    '$name: HUD roles ≥ 7 CSS px, other roles ≥ 10 CSS px cap height',
    ({ layout, k }) => {
      for (const fitWidth of FIT_WIDTHS) {
        for (const role of HUD_ROLES) {
          expect(capHeightOf(roundTextStyle(layout, role, fitWidth)) * k).toBeGreaterThanOrEqual(7);
        }
        for (const role of MENU_ROLES) {
          expect(capHeightOf(roundTextStyle(layout, role, fitWidth)) * k).toBeGreaterThanOrEqual(
            10,
          );
        }
      }
    },
  );
});

describe('roundTextStyle choices', () => {
  test('HUD roles and popups use hudText, hint and countdown label use menuText', () => {
    const layout = referenceLayout('fold-cover');
    expect(roundTextStyle(layout, 'hud-value')).toEqual(layout.hudText);
    expect(roundTextStyle(layout, 'popup')).toEqual(layout.hudText);
    expect(roundTextStyle(layout, 'hint')).toEqual(layout.menuText);
    expect(roundTextStyle(layout, 'countdown-label')).toEqual({ font: 'r15k-8', zoom: 2 });
    expect(roundTextStyle(layout, 'countdown-digit')).toEqual({ font: 'r15k-8', zoom: 4 });
    expect(roundTextStyle(referenceLayout('phone-portrait'), 'countdown-digit')).toEqual({
      font: 'r15k-8',
      zoom: TUNING.overlay.digitFactor,
    });
  });

  test('a banner doubles only when it still fits the field', () => {
    const layout = referenceLayout('phone-portrait');
    expect(roundTextStyle(layout, 'banner', 100)).toEqual({ font: 'r15k-8', zoom: 2 });
    expect(roundTextStyle(layout, 'banner', 120)).toEqual({ font: 'r15k-8', zoom: 1 });
    expect(roundTextStyle(layout, 'banner')).toEqual(layout.menuText);
  });

  test('a large HUD value doubles only in side panels it fits', () => {
    const sides = referenceLayout('phone-landscape');
    expect(roundTextStyle(sides, 'hud-value-large', 20)).toEqual({ font: 'r15k-5', zoom: 2 });
    expect(roundTextStyle(sides, 'hud-value-large', 40)).toEqual(sides.hudText);
    const stacked = referenceLayout('phone-portrait');
    expect(roundTextStyle(stacked, 'hud-value-large', 5)).toEqual(stacked.hudText);
  });

  test('cap heights come from the layout text candidates', () => {
    expect(capHeightOf({ font: 'r15k-5', zoom: 1 })).toBe(5);
    expect(capHeightOf({ font: 'r15k-8', zoom: 3 })).toBe(24);
  });
});
