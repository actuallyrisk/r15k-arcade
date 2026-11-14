import { contentRegions, rectBottom } from '@r15k/engine';
import type { Layout, Point, Rect } from '@r15k/engine';
import { ICONS, labelWidth, rowHeightFor } from '@r15k/ui';
import type { TextStyle } from '@r15k/ui';
import { TOP10_SIZE } from '../save/top10.ts';
import { menuColumn } from './settings-frame.ts';
import { capHeightOf, fittingStyle } from './text-support.ts';

/** Gap between the title, the rows and the footer. */
const BLOCK_GAP = 6;
/** Gap between two footer buttons and between the two score columns. */
const COLUMN_GAP = 8;
/** Widest score column of the one-column list. */
const ONE_COLUMN_MAX_WIDTH = 168;
/** Margin above the title and below the footer. */
const EDGE_MARGIN = 4;
/** Widest score column of the two-column list. */
const TWO_COLUMN_MAX_WIDTH = 180;

/** Where the parts of the top-10 screen go for one layout. */
export interface Top10Layout {
  readonly titleStyle: TextStyle;
  /** Centre x and cap line of the title. */
  readonly title: Point;
  /** One column (ranks 1–10) or two (1–5 | 6–10). */
  readonly columns: readonly Rect[];
  /** Height of one row: cap height × zoom + 3. */
  readonly rowHeight: number;
  /** Width kept left of each row for the ▶ marker of the new entry. */
  readonly markerWidth: number;
  /** Play again and To hub in the fixed footer (stacked on compact layouts). */
  readonly buttons: readonly [Rect, Rect];
  readonly isFooterStacked: boolean;
}

/** The two footer buttons at the bottom of the interaction region. */
function footerButtons(
  layout: Layout,
  context: { readonly area: Rect; readonly column: { readonly x: number; readonly width: number } },
): {
  readonly buttons: readonly [Rect, Rect];
  readonly height: number;
  readonly isStacked: boolean;
} {
  const { area, column } = context;
  const height = rowHeightFor(layout.menuText, layout.minTouchTarget, 1);
  const isStacked = layout.sizeClass === 'compact';
  if (isStacked) {
    const top = rectBottom(area) - 2 * height - COLUMN_GAP / 2;
    const first = { x: column.x, y: top, width: column.width, height };
    return {
      buttons: [first, { ...first, y: top + height + COLUMN_GAP / 2 }],
      height: 2 * height + COLUMN_GAP / 2,
      isStacked,
    };
  }
  const width = Math.floor((column.width - COLUMN_GAP) / 2);
  const top = rectBottom(area) - height;
  const first = { x: column.x, y: top, width, height };
  return { buttons: [first, { ...first, x: column.x + width + COLUMN_GAP }], height, isStacked };
}

/** The score columns centred in the menu column: one (ranks 1–10) or two (1–5 | 6–10). */
function scoreColumns(
  column: { readonly x: number; readonly width: number },
  spec: { readonly isOneColumn: boolean; readonly top: number; readonly rowHeight: number },
): readonly Rect[] {
  const count = spec.isOneColumn ? 1 : 2;
  const rows = TOP10_SIZE / count;
  const width = spec.isOneColumn
    ? Math.min(ONE_COLUMN_MAX_WIDTH, column.width)
    : Math.min(TWO_COLUMN_MAX_WIDTH, Math.floor((column.width - COLUMN_GAP) / 2));
  const left =
    column.x + Math.floor((column.width - (count * width + (count - 1) * COLUMN_GAP)) / 2);
  return Array.from({ length: count }, (_unused, index) => ({
    x: left + index * (width + COLUMN_GAP),
    y: spec.top,
    width,
    height: rows * spec.rowHeight,
  }));
}

/** The top-10 layout: one column when title, 10 rows and footer fit the interaction region, else two. */
export function computeTop10Layout(layout: Layout, title: string): Top10Layout {
  const region = contentRegions(layout).interaction;
  const area = { ...region, y: region.y + EDGE_MARGIN, height: region.height - 2 * EDGE_MARGIN };
  const column = menuColumn(layout, area);
  const text = layout.menuText;
  const rowHeight = capHeightOf(text) + 3;
  const titleStyle = fittingStyle(title, text, { factors: [2], maxWidth: column.width });
  const titleHeight = capHeightOf(titleStyle);
  const footer = footerButtons(layout, { area, column });
  const space = area.height - footer.height - BLOCK_GAP;
  const isOneColumn =
    layout.sizeClass === 'compact' || titleHeight + BLOCK_GAP + TOP10_SIZE * rowHeight <= space;
  const rows = isOneColumn ? TOP10_SIZE : TOP10_SIZE / 2;
  const blockHeight = titleHeight + BLOCK_GAP + rows * rowHeight;
  const top = area.y + Math.max(0, Math.floor((space - blockHeight) / 2));
  const rowsTop = top + titleHeight + BLOCK_GAP;
  return {
    titleStyle,
    title: { x: column.x + Math.floor(column.width / 2), y: top },
    columns: scoreColumns(column, { isOneColumn, top: rowsTop, rowHeight }),
    rowHeight,
    markerWidth: labelWidth(ICONS.play, text) + 2,
    buttons: footer.buttons,
    isFooterStacked: footer.isStacked,
  };
}
