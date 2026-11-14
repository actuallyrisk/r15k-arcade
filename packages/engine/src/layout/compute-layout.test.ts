import { expect, test } from 'vitest';
import type { Rect } from '../math/geometry.ts';
import { computeLayout } from './compute-layout.ts';
import type { Layout, TextChoice, ViewportSnapshot } from './layout-types.ts';
import { REFERENCE_VIEWPORTS, referenceSnapshot } from './reference-viewports.ts';

const PLAYFIELD = { width: 240, minHeight: 120, maxHeight: 480 } as const;

// The worked examples, one row per viewport:
// name | device | s | logical | canvas offset | safe | HUD | menu | menu cap in CSS px | touch |
// arrangement | field | panels | size class
const WORKED_EXAMPLES = `
phone-portrait   | 1170x2532 | 4 | 292x633 | 1,0 | 0,36,292,571 | 8 | 8   | 10.67 | 36 | stacked  | 24,53,240,480  | hud 23,38,242,14; bottom 23,539,245,68 | regular
phone-landscape  | 2532x1170 | 6 | 422x195 | 0,0 | 24,0,374,184 | 5 | 8   | 16    | 24 | sides    | 89,3,240,175   | left 24,0,62,184; right 335,0,63,184 | regular
fold-cover       | 903x2315  | 3 | 301x771 | 0,1 | 0,21,301,736 | 8 | 8x2 | 18.29 | 42 | stacked  | 29,38,240,480  | hud 28,23,242,14; bottom 28,524,245,233 | compact
fold-open        | 1767x2208 | 7 | 252x315 | 1,1 | 0,9,252,300  | 5 | 8   | 21.33 | 18 | stacked  | 4,23,240,258   | hud 3,11,242,11; bottom 3,287,245,22 | large
fold-tabletop    | 1767x2208 | 7 | 252x315 | 1,1 | 0,9,252,300  | 5 | 8   | 21.33 | 18 | tabletop | 4,23,240,125   | hud 3,11,242,11; fieldSegment 0,9,252,145; segment 0,161,252,148; hinge 0,154,252,7 | large
fold-tabletop-l  | 2208x1767 | 5 | 441x353 | 1,1 | 0,13,441,331 | 5 | 8   | 15.24 | 26 | tabletop | 99,27,240,138  | hud 98,15,242,11; fieldSegment 0,13,441,158; segment 0,182,441,162; hinge 0,171,441,11 | large
tablet-portrait  | 1640x2360 | 6 | 273x393 | 1,1 | 0,0,273,386  | 5 | 8   | 24    | 16 | stacked  | 15,14,240,346  | hud 14,2,242,11; bottom 14,366,245,20 | large
tablet-landscape | 2360x1640 | 6 | 393x273 | 1,1 | 0,0,393,266  | 5 | 8   | 24    | 16 | sides    | 75,3,240,257   | left 0,0,72,266; right 321,0,72,266 | large
handheld         | 1280x800  | 3 | 426x266 | 1,1 | 0,0,426,266  | 5 | 8   | 24    | 16 | sides    | 91,3,240,257   | left 0,0,88,266; right 337,0,89,266 | large
desktop          | 2880x1800 | 7 | 411x257 | 1,0 | 0,0,411,257  | 5 | 8   | 28    | 14 | sides    | 84,3,240,248   | left 0,0,81,257; right 330,0,81,257 | large
ultrawide        | 2560x1080 | 7 | 365x154 | 2,1 | 0,0,365,154  | 5 | 8   | 56    | 7  | sides    | 61,3,240,145   | left 0,0,58,154; right 307,0,58,154 | large
desktop@1        | 1440x900  | 3 | 480x300 | 0,0 | 0,0,480,300  | 5 | 8   | 24    | 16 | sides    | 118,3,240,291  | left 0,0,115,300; right 364,0,116,300 | large
laptop@1.25      | 1920x1080 | 5 | 384x216 | 0,0 | 0,0,384,216  | 5 | 8   | 32    | 12 | sides    | 70,3,240,207   | left 0,0,67,216; right 316,0,68,216 | large
min-window       | 480x360   | 1 | 480x360 | 0,0 | 0,0,480,360  | 8 | 8x2 | 16    | 48 | sides    | 118,3,240,351  | left 0,0,115,360; right 364,0,116,360 | regular
book             | 1767x2208 | 3 | 589x736 | 0,0 | 0,21,589,701 | 8 | 8x2 | 18.29 | 42 | book     | 22,137,240,480 | hud 21,122,242,14; fieldSegment 0,21,287,701; segment 302,21,286,701; hinge 287,21,15,701 | large
`;

/** A viewport snapshot built from CSS size, DPR, segments and insets (the extra rows). */
function snapshot(
  css: readonly [number, number],
  dpr: number,
  segments: readonly Rect[],
): ViewportSnapshot {
  const isFolded = segments.length > 0;
  return {
    cssWidth: css[0],
    cssHeight: css[1],
    devicePixelRatio: dpr,
    deviceWidth: Math.round(css[0] * dpr),
    deviceHeight: Math.round(css[1] * dpr),
    safeArea: { top: isFolded ? 24 : 0, right: 0, bottom: isFolded ? 16 : 0, left: 0 },
    posture: { posture: isFolded ? 'book' : 'flat', segments },
  };
}

const BOOK_SEGMENTS = [
  { x: 0, y: 0, width: 336, height: 841 },
  { x: 337, y: 0, width: 336, height: 841 },
];
const EXTRA_VIEWPORTS: Readonly<Record<string, ViewportSnapshot>> = {
  'desktop@1': snapshot([1440, 900], 1, []),
  'laptop@1.25': snapshot([1536, 864], 1.25, []),
  'min-window': snapshot([480, 360], 1, []),
  book: snapshot([673, 841], 2.625, BOOK_SEGMENTS),
};

const numbers = (text: string, separator: string): number[] => text.split(separator).map(Number);

function parseRect(text: string): Rect {
  const [x = 0, y = 0, width = 0, height = 0] = numbers(text, ',');
  return { x, y, width, height };
}

function parseText(text: string): TextChoice {
  return { font: text.startsWith('5') ? 'r15k-5' : 'r15k-8', zoom: text.endsWith('x2') ? 2 : 1 };
}

/** The panels of one layout (every key present). */
type Panels = Pick<
  Layout,
  'hudBand' | 'sidePanels' | 'bottomPanel' | 'fieldSegment' | 'segmentPanel' | 'hinge'
>;

const NO_PANELS: Panels = {
  hudBand: undefined,
  sidePanels: undefined,
  bottomPanel: undefined,
  fieldSegment: undefined,
  segmentPanel: undefined,
  hinge: undefined,
};

/** The panel rectangles of a row, keyed like the layout. */
function parsePanels(text: string): Panels {
  const entries = text.split(';').map((part) => part.trim().split(' '));
  const rects = new Map(entries.map(([label = '', value = '']) => [label, parseRect(value)]));
  const left = rects.get('left');
  const right = rects.get('right');
  return {
    hudBand: rects.get('hud'),
    sidePanels: left === undefined || right === undefined ? undefined : [left, right],
    bottomPanel: rects.get('bottom'),
    fieldSegment: rects.get('fieldSegment'),
    segmentPanel: rects.get('segment'),
    hinge: rects.get('hinge'),
  };
}

/** The values of one worked example. */
interface Row {
  readonly name: string;
  readonly viewport: ViewportSnapshot;
  readonly device: readonly number[];
  readonly placement: Pick<
    Layout,
    'scale' | 'logical' | 'canvasOffsetDevice' | 'safe' | 'sizeClass'
  >;
  readonly text: Pick<Layout, 'hudText' | 'menuText' | 'minTouchTarget' | 'arrangement'>;
  readonly menuCss: number;
  readonly field: Rect;
  readonly panels: Panels;
}

function viewportNamed(name: string): ViewportSnapshot {
  const reference = REFERENCE_VIEWPORTS.find((viewport) => viewport.id === name);
  const viewport =
    reference === undefined ? EXTRA_VIEWPORTS[name] : referenceSnapshot(reference.id);
  if (viewport === undefined) {
    throw new Error(`no viewport for ${name}`);
  }
  return viewport;
}

const COLUMNS = [
  'name',
  'device',
  'scale',
  'logical',
  'offset',
  'safe',
  'hud',
  'menu',
  'menuCss',
  'touch',
  'arrangement',
  'field',
  'panels',
  'sizeClass',
] as const;
const ARRANGEMENTS: readonly Layout['arrangement'][] = [
  'stacked',
  'sides',
  'banded',
  'tabletop',
  'book',
];
const SIZE_CLASSES: readonly Layout['sizeClass'][] = ['compact', 'regular', 'large'];

/** The cells of one table line by column name. */
function cellsOf(line: string): Readonly<Record<(typeof COLUMNS)[number], string>> {
  const cells = line.split('|').map((cell) => cell.trim());
  const entries = COLUMNS.map((column, index) => [column, cells[index] ?? '']);
  return Object.fromEntries(entries) as Record<(typeof COLUMNS)[number], string>;
}

function pair(text: string, separator: string): readonly [number, number] {
  const [first, second] = numbers(text, separator);
  return [first ?? 0, second ?? 0];
}

function oneOf<T extends string>(values: readonly T[], text: string): T {
  const found = values.find((value) => value === text);
  if (found === undefined) {
    throw new Error(`unexpected value ${text}`);
  }
  return found;
}

function parseRow(line: string): Row {
  const cell = cellsOf(line);
  const [width, height] = pair(cell.logical, 'x');
  const [x, y] = pair(cell.offset, ',');
  return {
    name: cell.name,
    viewport: viewportNamed(cell.name),
    device: pair(cell.device, 'x'),
    placement: {
      scale: Number(cell.scale),
      logical: { width, height },
      canvasOffsetDevice: { x, y },
      safe: parseRect(cell.safe),
      sizeClass: oneOf(SIZE_CLASSES, cell.sizeClass),
    },
    text: {
      hudText: parseText(cell.hud),
      menuText: parseText(cell.menu),
      minTouchTarget: Number(cell.touch),
      arrangement: oneOf(ARRANGEMENTS, cell.arrangement),
    },
    menuCss: Number(cell.menuCss),
    field: parseRect(cell.field),
    panels: parsePanels(cell.panels),
  };
}

const ROWS = WORKED_EXAMPLES.trim().split('\n').map(parseRow);

/** The layout of a row; fails the test when the viewport does not fit. */
function layoutOf(viewport: ViewportSnapshot): Layout {
  const layout = computeLayout(viewport, PLAYFIELD);
  if (layout.kind !== 'ok') {
    throw new Error('expected a fitting layout');
  }
  return layout;
}

test.each(ROWS)(
  'worked examples: $name: device, scale, canvas, safe rect and size class',
  (row) => {
    const layout = layoutOf(row.viewport);
    expect([row.viewport.deviceWidth, row.viewport.deviceHeight]).toEqual(row.device);
    expect(layout).toMatchObject(row.placement);
    expect(layout.canvasDevice).toEqual({
      width: layout.logical.width * layout.scale,
      height: layout.logical.height * layout.scale,
    });
    expect(layout.cssPerLogical).toBe(layout.scale / row.viewport.devicePixelRatio);
  },
);

test.each(ROWS)('worked examples: $name: text, touch target and arrangement', (row) => {
  const layout = layoutOf(row.viewport);
  expect(layout).toMatchObject(row.text);
  const menuCap = layout.menuText.zoom === 2 ? 16 : 8;
  expect(menuCap * layout.cssPerLogical).toBeCloseTo(row.menuCss, 2);
  expect(layout.isTextReadable).toBe(true);
});

test.each(ROWS)('worked examples: $name: field, frame and panels', (row) => {
  const layout = layoutOf(row.viewport);
  const { field } = row;
  expect(layout.field).toEqual(field);
  expect(layout.frame).toEqual({
    x: field.x - 1,
    y: field.y - 1,
    width: 242,
    height: field.height + 2,
  });
  const { hudBand, sidePanels, bottomPanel, fieldSegment, segmentPanel, hinge } = layout;
  expect({ hudBand, sidePanels, bottomPanel, fieldSegment, segmentPanel, hinge }).toEqual({
    ...NO_PANELS,
    ...row.panels,
  });
});
