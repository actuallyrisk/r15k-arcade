import { centerRect, contentRegions } from '@r15k/engine';
import type { A11yNode, DrawTarget, Layout, Rect, SlotIndex } from '@r15k/engine';
import { drawLabel } from '@r15k/ui';
import type { TextStyle } from '@r15k/ui';
import { capHeightOf } from './text-support.ts';

/** Padding between a panel's frame and its content. */
const PANEL_PADDING = 6;
/** Gap between a button and its neighbours. */
const BUTTON_GAP = 4;
/** Margin a panel keeps to the edges of its region. */
const PANEL_MARGIN = 4;

/** One line of panel text (already wrapped and measured by the caller). */
export interface PanelText {
  readonly text: string;
  readonly style: TextStyle;
  readonly slot: SlotIndex;
  readonly shadowSlot?: SlotIndex;
}

/** A panel row: a text line, buttons side by side (one = full width) or a centred block (a widget). */
export type PanelItem =
  | { readonly kind: 'text'; readonly line: PanelText }
  | { readonly kind: 'buttons'; readonly count: number }
  | { readonly kind: 'block'; readonly width: number; readonly height: number };

/** A laid-out panel: its rect, where each text line goes and every button rect in order. */
export interface PanelPlan {
  readonly panel: Rect;
  readonly lines: readonly { readonly line: PanelText; readonly x: number; readonly y: number }[];
  readonly buttons: readonly Rect[];
  readonly blocks: readonly Rect[];
}

/** The region an overlay panel is centred in: the field, or the interaction segment of split layouts. */
export function overlayRegion(layout: Layout): Rect {
  const regions = contentRegions(layout);
  return regions.isSplit ? regions.interaction : layout.field;
}

/** The widest panel that keeps its margin inside `region`, at most `maxWidth`. */
export function panelWidth(region: Rect, maxWidth: number): number {
  return Math.max(1, Math.min(maxWidth, region.width - 2 * PANEL_MARGIN));
}

/** Space above an item: room for umlaut dots above text, a plain gap above buttons. */
function gapBefore(item: PanelItem): number {
  return item.kind === 'text' ? 3 * item.line.style.zoom + 1 : BUTTON_GAP;
}

/** Height of one panel item. */
function itemHeight(item: PanelItem, buttonHeight: number): number {
  switch (item.kind) {
    case 'text':
      return capHeightOf(item.line.style);
    case 'buttons':
      return buttonHeight;
    case 'block':
      return item.height;
  }
}

/** Height of a panel with these items. */
export function panelHeight(items: readonly PanelItem[], buttonHeight: number): number {
  const content = items.reduce(
    (sum, item, index) =>
      sum + itemHeight(item, buttonHeight) + (index === 0 ? 0 : gapBefore(item)),
    0,
  );
  return content + 2 * PANEL_PADDING;
}

/** The button rects of one row of `count` buttons side by side. */
function buttonRow(inner: Rect, count: number): readonly Rect[] {
  const width = Math.floor((inner.width - (count - 1) * BUTTON_GAP) / count);
  return Array.from({ length: count }, (_unused, index) => ({
    x: inner.x + index * (width + BUTTON_GAP),
    y: inner.y,
    width,
    height: inner.height,
  }));
}

/** Lays out a panel of `width` centred in `region`, items top to bottom. */
export function layoutPanel(
  region: Rect,
  spec: {
    readonly width: number;
    readonly items: readonly PanelItem[];
    readonly buttonHeight: number;
  },
): PanelPlan {
  const height = panelHeight(spec.items, spec.buttonHeight);
  const panel = centerRect(region, { width: spec.width, height });
  const left = panel.x + PANEL_PADDING;
  const innerWidth = spec.width - 2 * PANEL_PADDING;
  const lines: PanelPlan['lines'][number][] = [];
  const buttons: Rect[] = [];
  const blocks: Rect[] = [];
  let y = panel.y + PANEL_PADDING;
  spec.items.forEach((item, index) => {
    y += index === 0 ? 0 : gapBefore(item);
    const row = { x: left, y, width: innerWidth, height: itemHeight(item, spec.buttonHeight) };
    if (item.kind === 'text') {
      lines.push({ line: item.line, x: left + Math.floor(innerWidth / 2), y });
    } else if (item.kind === 'buttons') {
      buttons.push(...buttonRow(row, item.count));
    } else {
      blocks.push(centerRect(row, item));
    }
    y += row.height;
  });
  return { panel, lines, buttons, blocks };
}

/** The first candidate item list whose panel fits the region's height (else the last one). */
export function firstFitting(
  candidates: readonly (readonly PanelItem[])[],
  context: { readonly region: Rect; readonly buttonHeight: number },
): readonly PanelItem[] {
  const fitting = candidates.find(
    (items) => panelHeight(items, context.buttonHeight) <= context.region.height,
  );
  return fitting ?? candidates.at(-1) ?? [];
}

/** Draws the text lines of a panel, centred. */
export function drawPanelLines(target: DrawTarget, plan: PanelPlan): void {
  for (const { line, x, y } of plan.lines) {
    drawLabel(target, line.text, {
      style: line.style,
      slot: line.slot,
      x,
      y,
      align: 'center',
      ...(line.shadowSlot === undefined ? {} : { shadowSlot: line.shadowSlot }),
    });
  }
}

/** Text lines of a wrapped paragraph. */
export function textItems(
  lines: readonly string[],
  look: Omit<PanelText, 'text'>,
): readonly PanelItem[] {
  return lines.map((text) => ({ kind: 'text', line: { ...look, text } }));
}

/** Width left for text inside a panel of `width`. */
export function panelInnerWidth(width: number): number {
  return width - 2 * PANEL_PADDING;
}

/** A mirror heading or text node on a text line of a panel (none when the line does not exist). */
export function lineNode(
  plan: PanelPlan,
  node: {
    readonly index: number;
    readonly id: string;
    readonly label: string;
    readonly kind: 'heading' | 'text';
  },
): readonly A11yNode[] {
  const entry = plan.lines[node.index];
  if (entry === undefined) {
    return [];
  }
  const rect = {
    x: plan.panel.x,
    y: entry.y,
    width: plan.panel.width,
    height: capHeightOf(entry.line.style),
  };
  const base = { id: node.id, label: node.label, rect };
  return [
    node.kind === 'heading' ? { ...base, kind: 'heading', level: 2 } : { ...base, kind: 'text' },
  ];
}
