// R15K Arcade tools – every SFX definition the app plays: the game's round effects and the app's menu
// and intro effects, in this order (it is the order of the audio manifest).
import { UI_SFX } from '@r15k/arcade';
import { BUG_HUNT_SFX } from '@r15k/bug-hunt';
import type { SfxDefinition } from '@r15k/engine';

/** The SFX definitions rendered by `pnpm assets`. */
export const ALL_SFX: readonly SfxDefinition[] = [...BUG_HUNT_SFX, ...UI_SFX];
