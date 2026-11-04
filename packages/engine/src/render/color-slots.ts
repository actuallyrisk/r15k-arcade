// Private to render/: the slot index of every colour name, shared by the LUT builder and the remap.
import { ROLE_SLOT, ROLE_SLOT_NAMES, SLOT, SLOT_NAMES } from './slots.ts';
import type { ColorName, RoleSlotName, SlotIndex } from './slots.ts';

/** Every colour a palette defines, token slots 1…15 first, then role slots 16…17. */
export const COLOR_NAMES: readonly ColorName[] = [...SLOT_NAMES, ...ROLE_SLOT_NAMES];

/** Whether a colour name is a role slot. */
function isRoleSlotName(name: ColorName): name is RoleSlotName {
  return Object.hasOwn(ROLE_SLOT, name);
}

/** Slot index of a colour name. */
export function colorSlot(name: ColorName): SlotIndex {
  return isRoleSlotName(name) ? ROLE_SLOT[name] : SLOT[name];
}
