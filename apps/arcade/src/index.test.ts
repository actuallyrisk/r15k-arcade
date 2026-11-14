import { expect, test } from 'vitest';
import * as arcade from './index.ts';

/** Splits a space-separated list of export names. */
const names = (text: string): readonly string[] => text.split(' ');

/** Sorts names in code-unit order. */
const sorted = (list: readonly string[]): readonly string[] =>
  [...list].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/** Every runtime export of the barrel, grouped like the modules that declare them. */
const EXPECTED = [
  ...names('ARCADE_CATALOGS UI_SFX INTRO_TIMING APP_ICON_SPRITE_SHEET'),
  ...names('ARCADE_SAVE_SCHEMA DEFAULT_SETTINGS createDefaultSave validateSave SAVE_MIGRATIONS'),
  ...names('TOP10_SIZE qualifiesForTop10 insertTop10 bestScore'),
  ...names('buildSettingsWidgets applySettingsIntent resolveSettings applyResolvedSettings'),
  ...names('SNAPSHOT_APP_VERSION createSnapshotServices drawTooSmall'),
  ...names('createIntroScene createHubScene createSettingsScene createPauseScene'),
  ...names('createGameOverScene createInitialsScene createTop10Scene'),
];

test('the contract lists every runtime name once', () => {
  expect(new Set(EXPECTED).size).toBe(EXPECTED.length);
});

test('the barrel exports exactly the runtime names of the contract', () => {
  expect(sorted(Object.keys(arcade))).toEqual(sorted(EXPECTED));
});
