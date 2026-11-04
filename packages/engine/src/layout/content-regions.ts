import type { Rect } from '../math/geometry.ts';
import type { LayoutResult } from './layout-types.ts';

/** Where every scene places content. */
export interface ContentRegions {
  /** Titles, cabinet, field-like content. */
  readonly display: Rect;
  /** Menus, buttons, initials, touch areas. */
  readonly interaction: Rect;
  /** True on tabletop and book (display and interaction are different segments). */
  readonly isSplit: boolean;
}

/**
 * Flat and too-small: display = interaction = safe; tabletop: the upper and the lower segment; book:
 * the wider segment and the other one.
 */
export function contentRegions(layout: LayoutResult): ContentRegions {
  if (
    layout.kind === 'ok' &&
    layout.fieldSegment !== undefined &&
    layout.segmentPanel !== undefined
  ) {
    return { display: layout.fieldSegment, interaction: layout.segmentPanel, isSplit: true };
  }
  return { display: layout.safe, interaction: layout.safe, isSplit: false };
}
