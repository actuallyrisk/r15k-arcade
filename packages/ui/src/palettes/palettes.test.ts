import { describe, expect, test } from 'vitest';
import { ROLE_SLOT, SLOT } from '@r15k/engine';
import type { ColorName, SlotIndex } from '@r15k/engine';
import { UI_THEME } from '../theme/ui-theme.ts';
import { getPaletteLut } from './palette-cache.ts';
import { PALETTES, resolveThemePalette, SELECTABLE_THEMES } from './palettes.ts';
import type { PaletteId } from './palettes.ts';
import { R15K_DARK_TOKENS, R15K_LIGHT_TOKENS } from './tokens.ts';

/** Relative luminance (WCAG 2) of a 0xRRGGBB colour. */
function luminance(color: number): number {
  const channel = (shift: number): number => {
    const value = ((color >> shift) & 0xff) / 255;
    return value <= 0.039_28 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
}

/** WCAG contrast ratio of two colours. */
function contrast(a: number, b: number): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

const NAMES: readonly ColorName[] = [
  ...(Object.keys(SLOT).filter((name) => name !== 'transparent') as ColorName[]),
  'warning',
  'popupShadow',
];

/** The colour name of a slot index. */
function nameOf(slot: SlotIndex): ColorName {
  const entry = Object.entries({ ...SLOT, ...ROLE_SLOT }).find(([, value]) => value === slot);
  return (entry?.[0] ?? 'paper') as ColorName;
}

/** Contrast of two UI roles in a palette. */
function roleContrast(id: PaletteId, pair: readonly [SlotIndex, SlotIndex]): number {
  const colors = PALETTES[id].colors;
  return contrast(colors[nameOf(pair[0])], colors[nameOf(pair[1])]);
}

test('light and dark tokens come from r15k.dev and define every slot', () => {
  expect(R15K_LIGHT_TOKENS.ink).toBe('#0c0f0a');
  expect(R15K_DARK_TOKENS.paper).toBe('#12140f');
  expect(R15K_DARK_TOKENS.shadow).toBe('#f2f3ee');
  for (const id of Object.keys(PALETTES) as PaletteId[]) {
    expect(Object.keys(PALETTES[id].colors).sort()).toEqual([...NAMES].sort());
  }
});

test('only game-boy is locked and has the LCD grid; the body matches the paper', () => {
  expect(PALETTES['game-boy']).toMatchObject({ isLockedByDefault: true, hasLcdGrid: true });
  expect(PALETTES.light).toMatchObject({ isLockedByDefault: false, bodyBackground: '#ffffff' });
  expect(PALETTES['high-contrast'].bodyBackground).toBe('#ffffff');
});

test('themes resolve to light or dark', () => {
  expect(SELECTABLE_THEMES).toEqual(['system', 'light', 'dark']);
  expect(resolveThemePalette('system', true)).toBe('dark');
  expect(resolveThemePalette('system', false)).toBe('light');
  expect(resolveThemePalette('light', true)).toBe('light');
  expect(resolveThemePalette('dark', false)).toBe('dark');
});

test('LUTs are built once per palette with RGBA byte order', () => {
  const lut = getPaletteLut('light');
  expect(getPaletteLut('light')).toBe(lut);
  expect(lut[SLOT.ink]).toBe(0xff_0a_0f_0c);
  expect(getPaletteLut('dark')[SLOT.paper]).toBe(0xff_0f_14_12);
});

describe.each(['light', 'dark', 'high-contrast'] as const)('contrast of %s', (id) => {
  test('text on panels, HUD text and warnings on the HUD band reach 4:1', () => {
    expect(roleContrast(id, [UI_THEME.text, UI_THEME.panelFill])).toBeGreaterThanOrEqual(4);
    expect(roleContrast(id, [UI_THEME.hudText, UI_THEME.hudFill])).toBeGreaterThanOrEqual(4);
    expect(roleContrast(id, [UI_THEME.textWarning, UI_THEME.hudFill])).toBeGreaterThanOrEqual(4);
  });
});
