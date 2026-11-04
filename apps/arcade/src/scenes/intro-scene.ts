import { notImplemented } from '@r15k/engine';
import type { Scene } from '@r15k/engine';
import type { AppServices } from '../boot/app-services.ts';

/** Length of the intro. */
export type IntroMode = 'full' | 'short';

/** GAME OVER → CONTINUE? 9 … 0 → INSERT COIN; any key, tap, button or activation skips. */
export function createIntroScene(_services: AppServices, _mode: IntroMode): Scene {
  return notImplemented('arcade.createIntroScene');
}
