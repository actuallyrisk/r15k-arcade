import { notImplemented } from '@r15k/engine';
import type { RoundResult, Scene } from '@r15k/engine';
import type { AppServices } from '../boot/app-services.ts';

/** The qualifying round and its rank. */
export interface InitialsSceneOptions {
  readonly result: RoundResult;
  /** 1…10. */
  readonly rank: number;
}

/** Three-initials entry for a new top-10 score. */
export function createInitialsScene(_services: AppServices, _options: InitialsSceneOptions): Scene {
  return notImplemented('arcade.createInitialsScene');
}
