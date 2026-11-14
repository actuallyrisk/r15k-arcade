import { contentRegions, rectBottom, rectRight } from '@r15k/engine';
import type { Layout, Point, Rect } from '@r15k/engine';
import { fontFor, getUiFonts, labelWidth, rowHeightFor, rowLines, scaledChoice } from '@r15k/ui';
import type { TextStyle, Widget } from '@r15k/ui';
import { cornerButton } from './corner-button.ts';
import { capHeightOf } from './text-support.ts';

/** Widest menu column on large layouts (tablets, foldable inner displays, desktops). */
export const LARGE_MENU_MAX_WIDTH = 320;
/** Margin between a menu column and the edges of its region. */
const COLUMN_MARGIN = 4;
/** Vertical gap between two settings rows. */
export const SETTINGS_ROW_GAP = 2;

/** The fixed parts of the settings screen for one layout. */
export interface SettingsFrame {
  /** Back: hit rect at the top-left corner of the interaction region, drawn square inside it. */
  readonly backHit: Rect;
  readonly back: Rect;
  readonly titleStyle: TextStyle;
  /** Centre x and cap line of the title. */
  readonly title: Point;
  readonly titleRect: Rect;
  /** The scrolling rows below the title bar. */
  readonly scrollRegion: Rect;
  readonly column: { readonly x: number; readonly width: number };
}

/** The menu column of a region: centred, at most 320 px wide on large layouts. */
export function menuColumn(
  layout: Layout,
  region: Rect,
): { readonly x: number; readonly width: number } {
  const available = region.width - 2 * COLUMN_MARGIN;
  const width =
    layout.sizeClass === 'large' ? Math.min(LARGE_MENU_MAX_WIDTH, available) : available;
  return { x: region.x + Math.floor((region.width - width) / 2), width };
}

/** The title bar (Back and the title) and the scroll region below it. */
export function computeSettingsFrame(layout: Layout, title: string): SettingsFrame {
  const { interaction } = contentRegions(layout);
  const back = cornerButton(layout, { region: interaction, side: 'left' });
  const backHit = back.hit;
  const titleStyle = scaledChoice(layout.menuText, 1);
  const cap = capHeightOf(titleStyle);
  const barHeight = Math.max(rectBottom(backHit) - interaction.y, cap + 8);
  const column = menuColumn(layout, interaction);
  const width = labelWidth(title, titleStyle);
  const centred = column.x + Math.floor((column.width - width) / 2);
  const left = Math.max(centred, rectRight(backHit) + COLUMN_MARGIN);
  const titleY = interaction.y + Math.floor((barHeight - cap) / 2);
  const top = interaction.y + barHeight + SETTINGS_ROW_GAP;
  return {
    backHit,
    back: back.button,
    titleStyle,
    title: { x: left + Math.floor(width / 2), y: titleY },
    titleRect: { x: left, y: titleY, width, height: cap },
    scrollRegion: {
      x: column.x,
      y: top,
      width: column.width,
      height: rectBottom(interaction) - top,
    },
    column,
  };
}

/** Row heights of the settings widgets (two lines when label and value do not share one) and the footer. */
export function settingsRowHeights(layout: Layout, rows: readonly Widget[]): readonly number[] {
  const text = layout.menuText;
  const mt = layout.minTouchTarget;
  // The draw functions split a row only when label and value do not fit with one space between them.
  const gap = fontFor(text, getUiFonts()).metrics.spaceWidth * text.zoom;
  const heights = rows.map((widget) => {
    const isTwoLine = rowLines(widget, { text, gap }).isTwoLine;
    return rowHeightFor(text, mt, isTwoLine ? 2 : 1);
  });
  return [...heights, capHeightOf(text) + 8];
}
