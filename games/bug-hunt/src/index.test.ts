import { expect, test } from 'vitest';
import * as bugHunt from './index.ts';

/** Splits a space-separated list of export names. */
const names = (text: string): readonly string[] => text.split(' ');

/** Sorts names in code-unit order. */
const sorted = (list: readonly string[]): readonly string[] =>
  [...list].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/** Every runtime export of the barrel, grouped like the modules that declare them. */
const EXPECTED = [
  ...names('NO_INPUT createInitialState step secondsLeft difficultyProgress spawnIntervalSeconds'),
  ...names('fallSeconds comboMultiplier isCaught hashState toRoundStats'),
  ...names('appendInput inputAt runReplay recordBotReplay parseReplay botInput'),
  ...names('TUNING CONTENT_VERSION BUG_HUNT_SFX CAT_SPRITE_SHEET ITEM_SPRITE_SHEET BUG_HUNT_GAME'),
  ...names('createRoundViewState advanceRoundView renderRound getBugHuntSprites BUG_HUNT_CATALOGS'),
];

test('the contract lists every runtime name once', () => {
  expect(new Set(EXPECTED).size).toBe(EXPECTED.length);
});

test('the barrel exports exactly the runtime names of the contract', () => {
  expect(sorted(Object.keys(bugHunt))).toEqual(sorted(EXPECTED));
});
