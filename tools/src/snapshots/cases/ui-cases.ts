// R15K Arcade tools – pixel snapshot cases of the UI package (ids start with 'ui-'): both bitmap fonts
// with every glyph of the required character set, and every widget kind in each of its states.
import { drawText, fillRect, strokeRect } from '@r15k/engine';
import type { CompiledFont, DrawTarget, Rect, TextChoice } from '@r15k/engine';
import {
  drawDialog,
  drawGridPaper,
  drawLabel,
  drawPanel,
  drawWidget,
  ICONS,
  initialsSize,
  layoutDialog,
  REQUIRED_CHARSET,
  rowHeightFor,
  rowLines,
  UI_CATALOGS,
  UI_THEME,
} from '@r15k/ui';
import type { ButtonWidget, SelectorOption, Widget, WidgetDrawOptions } from '@r15k/ui';
import type { SnapshotCase, SnapshotEnvironment } from '../snapshot-case.ts';

const MENU: TextChoice = { font: 'r15k-8', zoom: 1 };
const GLYPHS = Array.from(REQUIRED_CHARSET);
const GRID_COLUMNS = 26;

/** Layout of a font sheet: glyph grid cell size and sample lines. */
interface FontSheet {
  readonly font: 'r15k-5' | 'r15k-8';
  readonly cellHeight: number;
  readonly samples: readonly { readonly text: string; readonly zoom: 1 | 2 }[];
}

const SHEET_5: FontSheet = {
  font: 'r15k-5',
  cellHeight: 13,
  samples: [
    { text: 'SCORE 1234  TIME 59  HI 98  ×4  +5 -3', zoom: 2 },
    { text: "COMBO ×2 · READY? GO! TIME'S UP! 1:00", zoom: 1 },
    { text: 'the quick brown fox jumps over the lazy dog', zoom: 1 },
    { text: 'ÄÖÜ äöü ß ẞ „ZURÜCK“ “OK” ‚A‘ ’B’ © … • – —', zoom: 1 },
  ],
};

const SHEET_8: FontSheet = {
  font: 'r15k-8',
  cellHeight: 17,
  samples: [
    { text: 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG', zoom: 1 },
    { text: 'the quick brown fox jumps over the lazy dog', zoom: 1 },
    { text: 'ÄÖÜ äöü ß ẞ „ZURÜCK“ “OK” ‚A‘ ’B’ © × · • … – —', zoom: 1 },
    { text: 'EINSTELLUNGEN ← SYSTEM →', zoom: 2 },
  ],
};

/** Every glyph of the required set in a grid, drawn directly (lower case included); returns its bottom. */
function drawGlyphGrid(target: DrawTarget, font: CompiledFont, cellHeight: number): number {
  const cellWidth = 14;
  const capOffset = font.metrics.ascent - font.metrics.capHeight;
  GLYPHS.forEach((char, index) => {
    const x = 14 + (index % GRID_COLUMNS) * cellWidth;
    const y = 26 + Math.floor(index / GRID_COLUMNS) * cellHeight;
    fillRect(target, { x, y, width: cellWidth - 2, height: cellHeight - 2 }, UI_THEME.gridLine);
    const glyphTop = y + Math.floor((cellHeight - 2 - font.cellHeight) / 2);
    const slot = index % 2 === 0 ? UI_THEME.text : UI_THEME.textAccent;
    const centre = x + Math.floor((cellWidth - 2) / 2);
    drawText(target, char, { font, slot, x: centre, y: glyphTop + capOffset, align: 'center' });
  });
  return 26 + Math.ceil(GLYPHS.length / GRID_COLUMNS) * cellHeight;
}

/** A font sheet on grid paper: title, glyph grid and sample lines. */
function drawFontSheet(environment: SnapshotEnvironment, sheet: FontSheet): void {
  const { target } = environment;
  const { width, height } = target.framebuffer;
  drawGridPaper(target, { x: 0, y: 0, width, height });
  drawPanel(target, { x: 6, y: 6, width: width - 15, height: height - 15 });
  const font = sheet.font === 'r15k-5' ? environment.fonts.small : environment.fonts.large;
  const title = `${sheet.font} · ${String(GLYPHS.length)} glyphs`;
  drawLabel(target, title, { style: MENU, slot: UI_THEME.textAccent, x: 14, y: 13 });
  let y = drawGlyphGrid(target, font, sheet.cellHeight) + 6;
  for (const sample of sheet.samples) {
    drawText(target, sample.text, { font, slot: UI_THEME.text, x: 14, y, zoom: sample.zoom });
    y += font.metrics.lineHeight * sample.zoom;
  }
}

/** A button of the widget sheet. */
function button(id: string, rect: Rect, variant: ButtonWidget['variant']): ButtonWidget {
  const icon = variant === 'icon' ? 'gear' : variant === 'primary' ? 'play' : undefined;
  const label = variant === 'icon' ? 'Settings' : 'Start';
  return { kind: 'button', id, rect, label, isDisabled: false, variant, icon };
}

const STATES = ['normal', 'focused', 'pressed', 'disabled'] as const;
const THEMES: readonly SelectorOption[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
];

/** Buttons and row widgets of one state column (x = column left edge). */
function columnWidgets(column: string, x: number, environment: SnapshotEnvironment): Widget[] {
  const { i18n } = environment;
  const row = (index: number): Rect => ({ x, y: 90 + index * 20, width: 96, height: 16 });
  const base = {
    isDisabled: false,
    onText: i18n.t('ui.toggle.on'),
    offText: i18n.t('ui.toggle.off'),
  };
  const percent = i18n.t('ui.slider.percent', { value: 70 });
  return [
    button(`${column}-primary`, { x, y: 16, width: 62, height: 16 }, 'primary'),
    button(`${column}-secondary`, { x, y: 38, width: 62, height: 16 }, 'secondary'),
    button(`${column}-icon`, { x, y: 60, width: 20, height: 20 }, 'icon'),
    { ...base, kind: 'toggle', id: `${column}-on`, rect: row(0), label: 'Mute', isOn: true },
    { ...base, kind: 'toggle', id: `${column}-off`, rect: row(1), label: 'Intro', isOn: false },
    {
      ...{ kind: 'slider', id: `${column}-sfx`, rect: row(2), label: 'Sfx', isDisabled: false },
      ...{ value: 70, min: 0, max: 100, step: 10, valueText: percent },
    },
    {
      ...{
        kind: 'selector',
        id: `${column}-theme`,
        rect: row(3),
        label: 'Theme',
        isDisabled: false,
      },
      ...{ options: THEMES, selectedId: 'system' },
    },
  ];
}

/** Every widget kind in the four states, one column per state. */
function drawStateColumns(environment: SnapshotEnvironment): void {
  const { target } = environment;
  STATES.forEach((state, column) => {
    const x = 8 + column * 102;
    const options: WidgetDrawOptions = {
      text: MENU,
      isFocused: state === 'focused',
      hasFocusRing: true,
      isPressed: state === 'pressed',
    };
    drawLabel(target, state, { style: MENU, slot: UI_THEME.textMuted, x, y: 4 });
    for (const widget of columnWidgets(state, x, environment)) {
      drawWidget(target, { ...widget, isDisabled: state === 'disabled' }, options);
    }
  });
}

/** The selected look of a list row: selected fill, 1 px selected border, play marker on the left. */
function drawSelectedRow(target: DrawTarget, rect: Rect): void {
  fillRect(target, rect, UI_THEME.selectedFill);
  strokeRect(target, rect, UI_THEME.selectedBorder);
  const y = rect.y + Math.floor((rect.height - 8) / 2);
  const style = MENU;
  drawLabel(target, ICONS.play, { style, slot: UI_THEME.selectedBorder, x: rect.x - 8, y });
  drawLabel(target, '4. ABC', { style, slot: UI_THEME.text, x: rect.x + 4, y });
  const right = rect.x + rect.width - 4;
  drawLabel(target, '1234', { style, slot: UI_THEME.text, x: right, y, align: 'right' });
}

/** Initials (focused, and pressed on the last letter) and a two-line selector row. */
function drawInitialsAndRow(environment: SnapshotEnvironment): void {
  const { target, layout } = environment;
  const focused = { text: MENU, isFocused: true, hasFocusRing: true, isPressed: false };
  const rect = { x: 8, y: 182, ...initialsSize(layout.minTouchTarget, MENU) };
  const initials: Widget = {
    ...{ kind: 'initials', id: 'initials', rect, label: 'Initials', isDisabled: false },
    ...{ letters: 'R1K', cursor: 1 },
  };
  drawWidget(target, initials, focused);
  const pressed = { ...initials, id: 'pressed', rect: { ...rect, x: 88 }, cursor: 2 };
  drawWidget(target, pressed, { ...focused, isFocused: false, isPressed: true });
  const motion: Widget = {
    ...{ kind: 'selector', id: 'motion', label: 'Reduced motion', isDisabled: false },
    ...{ rect: { x: 172, y: 182, width: 110, height: 0 }, options: THEMES, selectedId: 'system' },
  };
  const lines = rowLines(motion, { text: MENU, gap: 4 }).isTwoLine ? 2 : 1;
  const height = rowHeightFor(MENU, layout.minTouchTarget, lines);
  drawWidget(target, { ...motion, rect: { ...motion.rect, height } }, focused);
  drawSelectedRow(target, { x: 182, y: 224, width: 100, height: 14 });
}

/** A dialog with a title, a message and two buttons, laid out in the bottom-right corner. */
function drawSheetDialog(environment: SnapshotEnvironment): void {
  const empty = { x: 0, y: 0, width: 0, height: 0 };
  const buttons = [
    { ...button('quit', empty, 'primary'), icon: undefined, label: 'Quit' },
    { ...button('stay', empty, 'secondary'), label: 'Stay' },
  ];
  const region = { x: 292, y: 170, width: 119, height: 87 };
  const options = { text: MENU, minTouchTarget: environment.layout.minTouchTarget };
  const model = layoutDialog(
    region,
    { title: 'Quit?', message: 'The round ends.', buttons },
    options,
  );
  drawDialog(environment.target, model, {
    text: MENU,
    isFocused: false,
    hasFocusRing: true,
    isPressed: false,
  });
}

/** The widget sheet on grid paper. */
function drawWidgetSheet(environment: SnapshotEnvironment): void {
  const { target } = environment;
  const { width, height } = target.framebuffer;
  drawGridPaper(target, { x: 0, y: 0, width, height });
  drawStateColumns(environment);
  drawInitialsAndRow(environment);
  drawSheetDialog(environment);
}

/** Snapshot cases of the UI package. */
export const UI_CASES: readonly SnapshotCase[] = [
  {
    id: 'ui-font-r15k-5',
    viewport: 'desktop',
    locale: 'en',
    catalogs: [UI_CATALOGS],
    draw: (environment: SnapshotEnvironment): void => {
      drawFontSheet(environment, SHEET_5);
    },
  },
  {
    id: 'ui-font-r15k-8',
    viewport: 'desktop',
    locale: 'en',
    catalogs: [UI_CATALOGS],
    draw: (environment: SnapshotEnvironment): void => {
      drawFontSheet(environment, SHEET_8);
    },
  },
  {
    id: 'ui-widgets',
    viewport: 'desktop',
    locale: 'en',
    catalogs: [UI_CATALOGS],
    draw: drawWidgetSheet,
  },
];
