import { notImplemented } from '@r15k/engine';
import type { RoundResult, Scene } from '@r15k/engine';
import type { AppServices } from '../boot/app-services.ts';

/** The finished round and the best score before it. */
export interface GameOverSceneOptions {
  readonly result: RoundResult;
  readonly previousBest: number;
}

/** The game-over overlay over the frozen round. */
export function createGameOverScene(_services: AppServices, _options: GameOverSceneOptions): Scene {
  return notImplemented('arcade.createGameOverScene');
}
