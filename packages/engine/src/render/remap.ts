import { notImplemented } from '../util/assert.ts';
import type { ColorName } from './slots.ts';

/** Slot-to-slot table (length 256, identity by default) applied while blitting. */
export type SlotRemap = Uint8Array;

/** Builds a remap from colour pairs; every other slot maps to itself. */
export function createRemap(_pairs: Readonly<Partial<Record<ColorName, ColorName>>>): SlotRemap {
  return notImplemented('engine.createRemap');
}
