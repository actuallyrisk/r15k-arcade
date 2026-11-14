import { COLOR_NAMES, colorSlot } from './color-slots.ts';
import type { ColorName } from './slots.ts';

/** Slot-to-slot table (length 256, identity by default) applied while blitting. */
export type SlotRemap = Uint8Array;

const REMAP_SIZE = 256;

/** Builds a remap from colour pairs (`{ ink: 'paper' }` draws ink pixels as paper); every other slot maps to itself. */
export function createRemap(pairs: Readonly<Partial<Record<ColorName, ColorName>>>): SlotRemap {
  const remap = new Uint8Array(REMAP_SIZE);
  for (let slot = 0; slot < REMAP_SIZE; slot += 1) {
    remap[slot] = slot;
  }
  for (const name of COLOR_NAMES) {
    const replacement = pairs[name];
    if (replacement !== undefined) {
      remap[colorSlot(name)] = colorSlot(replacement);
    }
  }
  return remap;
}
