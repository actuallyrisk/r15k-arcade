import { expect, test } from 'vitest';
import { buildPaletteLut, isLittleEndian, paletteFromHex, parseHexColor } from './palette-lut.ts';
import { createRemap } from './remap.ts';
import { ROLE_SLOT, ROLE_SLOT_NAMES, SLOT, SLOT_NAMES, SPRITE_CHAR_SLOTS } from './slots.ts';
import type { ColorName } from './slots.ts';

const LIGHT_HEX: Readonly<Record<ColorName, string>> = {
  paper: '#ffffff',
  ink: '#0c0f0a',
  blue: '#5865f2',
  blueInk: '#3b47d6',
  blueTint: '#eef0ff',
  pink: '#f4b6c2',
  pinkInk: '#e58ba0',
  green: '#2ecc71',
  gold: '#f2c14e',
  grey: '#6f736c',
  greyStrong: '#5c605a',
  greyLight: '#c9ccc6',
  greyFaint: '#eceee9',
  grid: '#eeeeee',
  shadow: '#5865f2',
  warning: '#f4b6c2',
  popupShadow: '#0c0f0a',
};

test('parseHexColor accepts exactly #rrggbb', () => {
  expect(parseHexColor('#5865f2')).toBe(0x5865f2);
  expect(parseHexColor('#ABCDEF')).toBe(0xabcdef);
  for (const text of ['5865f2', '#fff', '#5865f2ff', '#gggggg']) {
    expect(() => parseHexColor(text)).toThrow('expected #rrggbb');
  }
});

test('the LUT stores opaque RGBA bytes per slot, role slots included', () => {
  const lut = buildPaletteLut(paletteFromHex(LIGHT_HEX));
  expect(lut).toHaveLength(256);
  const bytes = new Uint8Array(lut.buffer);
  const rgbaAt = (slot: number): number[] => Array.from(bytes.subarray(slot * 4, slot * 4 + 4));
  expect(rgbaAt(SLOT.ink)).toEqual([0x0c, 0x0f, 0x0a, 0xff]);
  expect(rgbaAt(SLOT.blue)).toEqual([0x58, 0x65, 0xf2, 0xff]);
  expect(rgbaAt(ROLE_SLOT.warning)).toEqual([0xf4, 0xb6, 0xc2, 0xff]);
  expect(rgbaAt(ROLE_SLOT.popupShadow)).toEqual([0x0c, 0x0f, 0x0a, 0xff]);
  expect(lut[SLOT.gold]).toBe(0xff4ec1f2);
});

test('slot 0 and every unused entry hold the paper colour', () => {
  const lut = buildPaletteLut(paletteFromHex({ ...LIGHT_HEX, paper: '#123456' }));
  const paper = 0xff563412;
  expect(lut[SLOT.transparent]).toBe(paper);
  expect(lut[SLOT.paper]).toBe(paper);
  for (let slot = 18; slot < 256; slot += 1) {
    expect(lut[slot]).toBe(paper);
  }
});

test('the platform is little-endian (the presenter depends on it)', () => {
  expect(isLittleEndian()).toBe(true);
});

test('slot names follow the index order and sprites never use role slots', () => {
  expect(SLOT_NAMES.map((name) => SLOT[name])).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
  expect(ROLE_SLOT_NAMES.map((name) => ROLE_SLOT[name])).toEqual([16, 17]);
  expect(Math.max(...Object.values(SPRITE_CHAR_SLOTS))).toBe(15);
});

test('a remap is the identity except for the given pairs', () => {
  const remap = createRemap({ ink: 'paper', blue: 'warning', warning: 'gold' });
  expect(remap).toHaveLength(256);
  expect(remap[SLOT.ink]).toBe(SLOT.paper);
  expect(remap[SLOT.blue]).toBe(ROLE_SLOT.warning);
  expect(remap[ROLE_SLOT.warning]).toBe(SLOT.gold);
  expect(remap[SLOT.paper]).toBe(SLOT.paper);
  expect(remap[0]).toBe(0);
  expect(remap[200]).toBe(200);
  expect(createRemap({})).toEqual(Uint8Array.from({ length: 256 }, (_, i) => i));
});
