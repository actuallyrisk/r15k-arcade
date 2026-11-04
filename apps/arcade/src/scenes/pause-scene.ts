import { notImplemented } from '@r15k/engine';
import type { Scene } from '@r15k/engine';
import type { AppServices } from '../boot/app-services.ts';

/** The pause overlay; resume and quit go through services.navigation. */
export function createPauseScene(_services: AppServices): Scene {
  return notImplemented('arcade.createPauseScene');
}
