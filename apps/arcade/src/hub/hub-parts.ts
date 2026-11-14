import { rectBottom, rectRight, rectsIntersect } from '@r15k/engine';
import type { ContentRegions, Layout, Point, Rect, TextChoice } from '@r15k/engine';
import { capHeightOf } from '../scenes/text-support.ts';

/** Space the score list keeps to its neighbours. */
const SCORE_GAP = 4;
/** The score list goes beside the cabinet when at least this much width remains there. */
const SCORES_BESIDE_MIN_WIDTH = 80;
/** Rows of the score list on regular layouts (large layouts show the full top 10 when it fits). */
const SHORT_LIST_ROWS = 3;
/** Rows of the full top 10. */
const FULL_LIST_ROWS = 10;

/** The parts of the arcade cabinet; `box` includes the 1 px outline, the shadow lies at +3/+3. */
export interface CabinetGeometry {
  readonly box: Rect;
  readonly marquee: Rect;
  /** Width × floor(3 · width / 4). */
  readonly screen: Rect;
  readonly controls: Rect;
}

/** Where the score list goes and how many rows it shows. */
export interface ScoreBlock {
  readonly rect: Rect;
  readonly rows: number;
}

/** Places a cabinet with its top-left corner at (x, y). */
export function placeCabinet(spec: {
  readonly x: number;
  readonly y: number;
  readonly screenWidth: number;
  readonly marquee: number;
}): CabinetGeometry {
  const { x, y, screenWidth, marquee } = spec;
  const screenHeight = Math.floor((3 * screenWidth) / 4);
  const width = screenWidth + 10;
  const screen = { x: x + 5, y: y + 1 + marquee + 4, width: screenWidth, height: screenHeight };
  return {
    box: { x, y, width, height: marquee + screenHeight + 23 },
    marquee: { x: x + 1, y: y + 1, width: width - 2, height: marquee },
    screen,
    controls: { x: x + 1, y: rectBottom(screen) + 4, width: width - 2, height: 13 },
  };
}

/** Height of the score list: heading plus rows of cap height + 3. */
export function scoreBlockHeight(text: TextChoice, rows: number): number {
  const cap = capHeightOf(text);
  return cap + 4 + rows * (cap + 3);
}

/** The rows the list shows within `height`: the full top 10 on large layouts, else 3 (0 = none). */
function rowsWithin(
  layout: Layout,
  context: { readonly stored: number; readonly height: number },
  scoreHeight: (rows: number) => number,
): number {
  const full = Math.min(FULL_LIST_ROWS, context.stored);
  if (layout.sizeClass === 'large' && scoreHeight(full) <= context.height) {
    return full;
  }
  const short = Math.min(SHORT_LIST_ROWS, context.stored);
  return scoreHeight(short) <= context.height ? short : 0;
}

/** What both score placements need. */
interface ScoreContext {
  readonly hub: {
    readonly kind: string;
    readonly cabinet: CabinetGeometry;
    readonly prompt: Point;
  };
  readonly input: { readonly scoreRows: number; readonly scoreWidth: number };
  readonly scoreHeight: (rows: number) => number;
}

/** The list beside the cabinet when at least 80 px remain right of it (stacked hub only). */
export function scoresBeside(
  layout: Layout,
  context: ScoreContext & { readonly region: Rect },
): ScoreBlock | undefined {
  const { hub, region, input } = context;
  const { box } = hub.cabinet;
  const left = rectRight(box) + 3 + SCORE_GAP;
  const space = rectRight(region) - left - SCORE_GAP;
  if (layout.sizeClass === 'compact' || hub.kind !== 'stacked' || space < SCORES_BESIDE_MIN_WIDTH) {
    return undefined;
  }
  const rows = rowsWithin(
    layout,
    { stored: input.scoreRows, height: region.height },
    context.scoreHeight,
  );
  if (rows === 0) {
    return undefined;
  }
  const width = Math.min(input.scoreWidth, space);
  const height = context.scoreHeight(rows);
  const y = Math.max(region.y, box.y + Math.floor((box.height - height) / 2));
  return { rect: { x: left + Math.floor((space - width) / 2), y, width, height }, rows };
}

/** The area below the prompt (or the interaction segment of split layouts) the list may use. */
function belowArea(
  layout: Layout,
  context: ScoreContext & { readonly regions: ContentRegions },
): Rect {
  const { regions, hub } = context;
  if (regions.isSplit) {
    return regions.interaction;
  }
  const { display } = regions;
  const top = hub.prompt.y + capHeightOf(layout.menuText) + 2 + SCORE_GAP;
  // The side-by-side hub keeps the list in its left column, which is centred on the prompt.
  const width = hub.kind === 'stacked' ? display.width : 2 * (hub.prompt.x - display.x);
  return { x: display.x, y: top, width, height: rectBottom(display) - top };
}

/** The list below the prompt (split layouts: centred in the interaction segment), if it fits. */
export function scoresBelow(
  layout: Layout,
  context: ScoreContext & { readonly regions: ContentRegions; readonly gearHit: Rect },
): ScoreBlock | undefined {
  const { input } = context;
  if (layout.sizeClass === 'compact' || input.scoreRows === 0) {
    return undefined;
  }
  const area = belowArea(layout, context);
  const rows = rowsWithin(
    layout,
    { stored: input.scoreRows, height: area.height },
    context.scoreHeight,
  );
  if (rows === 0) {
    return undefined;
  }
  const width = Math.min(input.scoreWidth, area.width - 2 * SCORE_GAP);
  const height = context.scoreHeight(rows);
  const offsetY = context.regions.isSplit ? Math.floor((area.height - height) / 2) : 0;
  const rect = {
    x: area.x + Math.floor((area.width - width) / 2),
    y: area.y + offsetY,
    width,
    height,
  };
  if (!rectsIntersect(rect, context.gearHit)) {
    return { rect, rows };
  }
  const y = rectBottom(context.gearHit);
  return y + height <= rectBottom(area) ? { rect: { ...rect, y }, rows } : undefined;
}
