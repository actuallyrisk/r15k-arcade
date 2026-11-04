import { notImplemented } from '@r15k/engine';
import type { Scene } from '@r15k/engine';
import type { AppServices } from '../boot/app-services.ts';

/** Which entry is the new one. */
export interface Top10SceneOptions {
  readonly highlightRank: number | undefined;
}

/** The Arcade top 10 with "play again" and "to hub". */
export function createTop10Scene(_services: AppServices, _options: Top10SceneOptions): Scene {
  return notImplemented('arcade.createTop10Scene');
}
