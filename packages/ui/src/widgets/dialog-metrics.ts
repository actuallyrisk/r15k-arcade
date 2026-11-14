import type { Rect, TextChoice } from '@r15k/engine';
import { wrapLabel } from '../draw/label.ts';
import { capHeightOf, fontMetrics, spaceWidthOf } from '../text/text-metrics.ts';
import { CONTROL_SHADOW } from './row-layout.ts';

// Sizes of the dialog. Everything the drawing needs to recover the panel from the button rects depends
// on the text style only; the region and the touch target only shape the layout.

/** Sizes of a dialog for a text style (and, for layout, a region and touch target). */
export interface DialogMetrics {
  /** Inner padding of the panel. */
  readonly padding: number;
  /** Title line including the space below it. */
  readonly titleHeight: number;
  /** One message line. */
  readonly lineHeight: number;
  /** Space between the message and the buttons. */
  readonly textGap: number;
  /** Horizontal padding of a button label. */
  readonly buttonPadding: number;
  readonly buttonHeight: number;
  /** Space between two buttons (so their touch areas do not overlap where possible). */
  readonly gap: number;
  readonly maxInnerWidth: number;
  /** Hard shadow of the panel. */
  readonly panelShadow: number;
}

const PANEL_SHADOW = 3;
/** Readable line length of a dialog message in cap heights. */
const MAX_LINE_CAPS = 30;

/** Dialog sizes; `region` undefined (drawing) leaves the inner width unbounded. */
export function dialogMetrics(
  region: Rect | undefined,
  options: { readonly text: TextChoice; readonly minTouchTarget: number },
): DialogMetrics {
  const { text, minTouchTarget } = options;
  const capHeight = capHeightOf(text);
  const padding = capHeight;
  const buttonHeight = capHeight + 8 * text.zoom;
  const available =
    region === undefined ? Number.POSITIVE_INFINITY : region.width - 2 * padding - PANEL_SHADOW;
  return {
    padding,
    titleHeight: fontMetrics(text).lineHeight * text.zoom,
    lineHeight: fontMetrics(text).lineHeight * text.zoom,
    textGap: Math.floor(capHeight / 2),
    buttonPadding: 2 * spaceWidthOf(text),
    buttonHeight,
    gap: Math.max(4 * text.zoom, minTouchTarget - buttonHeight - CONTROL_SHADOW),
    maxInnerWidth: Math.min(available, MAX_LINE_CAPS * capHeight),
    panelShadow: PANEL_SHADOW,
  };
}

/** The wrapped message lines (none for an empty message). */
export function messageLines(
  message: string,
  options: { readonly width: number; readonly text: TextChoice },
): readonly string[] {
  return message === '' ? [] : wrapLabel(message, { style: options.text, maxWidth: options.width });
}

/** Height of the title, the message and the gap above the buttons. */
export function dialogTextHeight(
  model: { readonly title: string; readonly message: string },
  context: { readonly width: number; readonly text: TextChoice; readonly metrics: DialogMetrics },
): number {
  const { metrics } = context;
  const lines = messageLines(model.message, context).length;
  const title = model.title === '' ? 0 : metrics.titleHeight;
  return title + lines * metrics.lineHeight + metrics.textGap;
}
