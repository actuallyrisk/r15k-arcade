import { notImplemented } from '@r15k/engine';
import type {
  CabinetScreenOptions,
  DrawTarget,
  GameModule,
  RoundContext,
  Scene,
} from '@r15k/engine';
import { BUG_HUNT_SFX } from '../content/sfx.ts';
import { TUNING } from '../content/tuning.ts';
import { BUG_HUNT_CATALOGS } from '../i18n/catalogs.ts';

/** Bug Hunt as the arcade app sees it. */
export const BUG_HUNT_GAME: GameModule = {
  id: 'bug-hunt',
  titleKey: 'bugHunt.title',
  modes: ['arcade'],
  playfield: TUNING.field,
  catalogs: BUG_HUNT_CATALOGS,
  sfx: BUG_HUNT_SFX,
  createRound(_context: RoundContext): Scene {
    return notImplemented('bug-hunt.BUG_HUNT_GAME.createRound');
  },
  drawCabinetScreen(_target: DrawTarget, _options: CabinetScreenOptions): void {
    return notImplemented('bug-hunt.BUG_HUNT_GAME.drawCabinetScreen');
  },
};
