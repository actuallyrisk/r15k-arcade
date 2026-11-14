import type { Rect, TextChoice } from '@r15k/engine';
import { capHeightOf } from '../text/text-metrics.ts';

/** Row height: max(lines × (capHeight · zoom + 4) + 4, minTouchTarget). */
export function rowHeightFor(choice: TextChoice, minTouchTarget: number, lines: 1 | 2): number {
  return Math.max(lines * (capHeightOf(choice) + 4) + 4, minTouchTarget);
}

/** Rects and scroll state of a menu column. */
export interface MenuColumnLayout {
  readonly rects: readonly Rect[];
  readonly visible: readonly boolean[];
  readonly scrollOffset: number;
  readonly hasMoreAbove: boolean;
  readonly hasMoreBelow: boolean;
  readonly moreAbove: Rect | undefined;
  readonly moreBelow: Rect | undefined;
}

/** Options of layoutMenuColumn. */
interface ColumnOptions {
  readonly region: Rect;
  readonly rowHeights: readonly number[];
  readonly rowGap: number;
  readonly focusIndex: number;
  readonly scrollOffset: number;
  readonly minTouchTarget: number;
}

/** Content offsets of the rows and the content height. */
function contentOffsets(options: ColumnOptions): {
  readonly tops: number[];
  readonly height: number;
} {
  const tops: number[] = [];
  let y = 0;
  options.rowHeights.forEach((height, index) => {
    tops.push(y);
    y += height + (index < options.rowHeights.length - 1 ? options.rowGap : 0);
  });
  return { tops, height: y };
}

/** The scroll offset that keeps the focused row fully between the indicator strips. */
function scrollForFocus(
  options: ColumnOptions,
  content: { readonly tops: number[]; readonly height: number },
): number {
  const { region, minTouchTarget: strip } = options;
  const maxScroll = content.height - region.height;
  let scroll = Math.min(Math.max(0, options.scrollOffset), maxScroll);
  const top = content.tops[options.focusIndex];
  const height = options.rowHeights[options.focusIndex];
  if (top === undefined || height === undefined) {
    return scroll;
  }
  if (top - scroll < (scroll > 0 ? strip : 0)) {
    scroll = Math.max(0, top - strip);
  }
  const bottomStrip = scroll < maxScroll ? strip : 0;
  if (top + height - scroll > region.height - bottomStrip) {
    scroll = Math.min(maxScroll, top + height - (region.height - strip));
  }
  return Math.min(Math.max(0, scroll), maxScroll);
}

/** A column whose content fits the region: every row visible, no scrolling. */
function unscrolled(options: ColumnOptions, tops: readonly number[]): MenuColumnLayout {
  const { region, rowHeights } = options;
  return {
    rects: rowHeights.map((height, index) => ({
      x: region.x,
      y: region.y + (tops[index] ?? 0),
      width: region.width,
      height,
    })),
    visible: rowHeights.map(() => true),
    scrollOffset: 0,
    hasMoreAbove: false,
    hasMoreBelow: false,
    moreAbove: undefined,
    moreBelow: undefined,
  };
}

/**
 * Lays out a scrolling column so the focused row is fully visible; scrollOffset is clamped to the
 * content. Rows outside the visible part keep their height but sit at the nearest region edge
 * (visible[i] false, not drawn); the ↑/↓ indicators take a strip of minTouchTarget height at the region
 * top/bottom when content lies beyond it.
 */
export function layoutMenuColumn(options: ColumnOptions): MenuColumnLayout {
  const { region, rowHeights, minTouchTarget: strip } = options;
  const content = contentOffsets(options);
  if (content.height <= region.height) {
    return unscrolled(options, content.tops);
  }
  const scroll = scrollForFocus(options, content);
  const hasMoreAbove = scroll > 0;
  const hasMoreBelow = scroll < content.height - region.height;
  const viewTop = region.y + (hasMoreAbove ? strip : 0);
  const viewBottom = region.y + region.height - (hasMoreBelow ? strip : 0);
  const rows = rowHeights.map((height, index) => {
    const y = region.y + (content.tops[index] ?? 0) - scroll;
    const isVisible = y >= viewTop && y + height <= viewBottom;
    const edgeY = y < viewTop ? region.y : region.y + region.height - height;
    return {
      rect: { x: region.x, y: isVisible ? y : edgeY, width: region.width, height },
      isVisible,
    };
  });
  return {
    rects: rows.map((row) => row.rect),
    visible: rows.map((row) => row.isVisible),
    scrollOffset: scroll,
    hasMoreAbove,
    hasMoreBelow,
    moreAbove: hasMoreAbove
      ? { x: region.x, y: region.y, width: region.width, height: strip }
      : undefined,
    moreBelow: hasMoreBelow
      ? { x: region.x, y: region.y + region.height - strip, width: region.width, height: strip }
      : undefined,
  };
}
