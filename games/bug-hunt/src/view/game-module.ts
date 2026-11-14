import type { GameModule } from '@r15k/engine';
import { BUG_HUNT_SFX } from '../content/sfx.ts';
import { TUNING } from '../content/tuning.ts';
import { BUG_HUNT_CATALOGS } from '../i18n/catalogs.ts';
import { drawCabinetPreview } from './cabinet-preview.ts';
import { RoundScene } from './round-scene.ts';

/** Bug Hunt as the arcade app sees it. */
export const BUG_HUNT_GAME: GameModule = {
  id: 'bug-hunt',
  titleKey: 'bugHunt.title',
  modes: ['arcade'],
  playfield: TUNING.field,
  catalogs: BUG_HUNT_CATALOGS,
  sfx: BUG_HUNT_SFX,
  createRound(context) {
    return new RoundScene(context);
  },
  drawCabinetScreen(target, options) {
    drawCabinetPreview(target, options);
  },
};
