import { expect, test } from 'vitest';
import * as ui from './index.ts';

/** Splits a space-separated list of export names. */
const names = (text: string): readonly string[] => text.split(' ');

/** Sorts names in code-unit order. */
const sorted = (list: readonly string[]): readonly string[] =>
  [...list].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/** Every runtime export of the barrel, grouped like the modules that declare them. */
const EXPECTED = [
  ...names('R15K_LIGHT_TOKENS R15K_DARK_TOKENS PALETTES SELECTABLE_THEMES resolveThemePalette'),
  ...names('getPaletteLut REQUIRED_CHARSET ICONS getUiFonts fontFor scaledChoice R15K_5 R15K_8'),
  ...names(
    'UI_THEME drawPanel drawFramedField drawGridPaper drawFocusRing drawLabel labelWidth wrapLabel',
  ),
  ...names(
    'drawButton drawToggle drawSlider drawSelector drawInitials INITIALS_ALPHABET INITIALS_LENGTH',
  ),
  ...names('stepInitials typeInitial drawWidget rowLines sliderTrackRect selectorArrowRects'),
  ...names('initialsHitAreas initialsSize layoutDialog drawDialog rowHeightFor layoutMenuColumn'),
  ...names(
    'createMenuState reduceMenu applyA11yEvent replaceWidgets nextFocusable hitRect widgetAt',
  ),
  ...names('MENU_DRAG_START_CSS menuA11yNodes promptGlyph shouldShowFocusRing UI_CATALOGS'),
];

test('the contract lists every runtime name once', () => {
  expect(new Set(EXPECTED).size).toBe(EXPECTED.length);
});

test('the barrel exports exactly the runtime names of the contract', () => {
  expect(sorted(Object.keys(ui))).toEqual(sorted(EXPECTED));
});
