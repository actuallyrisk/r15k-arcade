import { contentRegions, rectBottom, rectsIntersect, translateRect } from '@r15k/engine';
import type { Layout, Point, Rect } from '@r15k/engine';
import { labelWidth } from '@r15k/ui';
import type { TextStyle } from '@r15k/ui';
import { cornerButton } from '../scenes/corner-button.ts';
import { capHeightOf, fittingStyle } from '../scenes/text-support.ts';
import { placeCabinet, scoreBlockHeight, scoresBeside, scoresBelow } from './hub-parts.ts';
import type { CabinetGeometry, ScoreBlock } from './hub-parts.ts';

/** Largest screen width of the cabinet (logical px). */
const MAX_SCREEN_WIDTH = 192;
/** Smallest screen width of the cabinet; below it the hub switches to the side-by-side layout. */
const MIN_SCREEN_WIDTH = 64;
/** Regular layouts: the screen stays this much narrower than the display. */
const STACKED_SIDE_MARGIN = 24;
/** Compact layouts: the cabinet footprint stays this much narrower than the display. */
const COMPACT_SIDE_MARGIN = 8;
/** Horizontal footprint of the cabinet beyond its screen: bezels, outline and shadow. */
const CABINET_EXTRA_WIDTH = 13;
/** Gap between the title, the cabinet and the prompt. */
const BLOCK_GAP = 4;
/** Minimum width of the left column of the side-by-side hub. */
const SIDE_COLUMN_MIN_WIDTH = 120;

/** Where everything of the hub goes for one layout. */
export interface HubLayout {
  readonly kind: 'stacked' | 'side-by-side';
  readonly titleStyle: TextStyle;
  /** Centre x and cap line of the title. */
  readonly title: Point;
  readonly cabinet: CabinetGeometry;
  /** Centre x and cap line of the start prompt. */
  readonly prompt: Point;
  /** The gear's hit rect (top-right corner of the interaction region) and its drawn square inside. */
  readonly gearHit: Rect;
  readonly gear: Rect;
  readonly scores: ScoreBlock | undefined;
}

/** What the hub layout measures besides the layout. */
export interface HubLayoutInput {
  readonly title: string;
  /** Entries stored in the top 10 (0 → no list). */
  readonly scoreRows: number;
  /** Width of the widest score line (heading included). */
  readonly scoreWidth: number;
}

/** Fixed block heights of the hub: title T, prompt P and marquee M. */
interface HubBlocks {
  readonly titleStyle: TextStyle;
  readonly title: number;
  readonly prompt: number;
  readonly marquee: number;
}

/** Cabinet height for a screen width: marquee, bezels, screen (4:3), control panel, outline and shadow. */
export function cabinetHeight(screenWidth: number, marquee: number): number {
  return marquee + 8 + Math.floor((3 * screenWidth) / 4) + 14 + 4;
}

/** The largest screen width ≤ `maxWidth` whose cabinet fits `maxHeight` (0 when none does). */
function largestScreenWidth(maxWidth: number, maxHeight: number, marquee: number): number {
  for (let width = Math.floor(maxWidth); width > 0; width -= 1) {
    if (cabinetHeight(width, marquee) <= maxHeight) {
      return width;
    }
  }
  return 0;
}

/** The block heights for this layout and title. */
function hubBlocks(layout: Layout, title: string, display: Rect): HubBlocks {
  const titleStyle = fittingStyle(title, layout.menuText, {
    factors: [2],
    maxWidth: display.width - 2 * BLOCK_GAP,
  });
  const cap = capHeightOf(layout.menuText);
  return { titleStyle, title: capHeightOf(titleStyle) + 4, prompt: cap + 4, marquee: cap + 6 };
}

/** The gear's hit rect at the top-right corner of the interaction region and its square inside. */
function gearRects(layout: Layout): { readonly gearHit: Rect; readonly gear: Rect } {
  const { interaction } = contentRegions(layout);
  const { hit, button } = cornerButton(layout, { region: interaction, side: 'right' });
  return { gearHit: hit, gear: button };
}

/** The stacked hub inside `region`, or undefined when its screen would be narrower than 64 px. */
function stackedHub(
  layout: Layout,
  context: { readonly region: Rect; readonly blocks: HubBlocks },
): Omit<HubLayout, 'gearHit' | 'gear' | 'scores'> | undefined {
  const { region, blocks } = context;
  const sideMargin =
    layout.sizeClass === 'compact'
      ? COMPACT_SIDE_MARGIN + CABINET_EXTRA_WIDTH
      : STACKED_SIDE_MARGIN;
  const maxWidth = Math.min(MAX_SCREEN_WIDTH, region.width - sideMargin);
  const fixed = blocks.title + BLOCK_GAP + BLOCK_GAP + blocks.prompt;
  const screenWidth = largestScreenWidth(maxWidth, region.height - fixed, blocks.marquee);
  if (screenWidth < MIN_SCREEN_WIDTH) {
    return undefined;
  }
  const height = fixed + cabinetHeight(screenWidth, blocks.marquee);
  const top = region.y + Math.floor((region.height - height) / 2);
  const centreX = region.x + Math.floor(region.width / 2);
  const cabinet = placeCabinet({
    x: centreX - Math.floor((screenWidth + CABINET_EXTRA_WIDTH) / 2),
    y: top + blocks.title + BLOCK_GAP,
    screenWidth,
    marquee: blocks.marquee,
  });
  const promptY = cabinet.box.y + cabinetHeight(screenWidth, blocks.marquee) + BLOCK_GAP + 2;
  return {
    kind: 'stacked',
    titleStyle: blocks.titleStyle,
    title: { x: centreX, y: top + 2 },
    cabinet,
    prompt: { x: centreX, y: promptY },
  };
}

/** The side-by-side hub: title and prompt in a left column, the cabinet on the right. */
function sideBySideHub(context: {
  readonly region: Rect;
  readonly blocks: HubBlocks;
  readonly titleWidth: number;
}): Omit<HubLayout, 'gearHit' | 'gear' | 'scores'> {
  const { region, blocks } = context;
  const columnWidth = Math.min(
    Math.floor(region.width / 2),
    Math.max(SIDE_COLUMN_MIN_WIDTH, context.titleWidth + 2 * BLOCK_GAP),
  );
  const cabinetRegionWidth = region.width - columnWidth - BLOCK_GAP;
  const maxWidth = Math.min(MAX_SCREEN_WIDTH, cabinetRegionWidth - CABINET_EXTRA_WIDTH);
  const fitted = largestScreenWidth(maxWidth, region.height - 2 * BLOCK_GAP, blocks.marquee);
  const screenWidth = Math.max(MIN_SCREEN_WIDTH, fitted);
  const height = cabinetHeight(screenWidth, blocks.marquee);
  const cabinetX = region.x + columnWidth + BLOCK_GAP;
  const cabinet = placeCabinet({
    x: cabinetX + Math.floor((cabinetRegionWidth - screenWidth - CABINET_EXTRA_WIDTH) / 2),
    y: region.y + Math.floor((region.height - height) / 2),
    screenWidth,
    marquee: blocks.marquee,
  });
  const columnCentre = region.x + Math.floor(columnWidth / 2);
  const textTop = region.y + Math.floor((region.height - blocks.title - blocks.prompt) / 2);
  return {
    kind: 'side-by-side',
    titleStyle: blocks.titleStyle,
    title: { x: columnCentre, y: textTop + 2 },
    cabinet,
    prompt: { x: columnCentre, y: textTop + blocks.title + 2 },
  };
}

/** The display region minus a top strip when the centred title would overlap the gear. */
function titleRegion(
  display: Rect,
  context: { readonly titleRect: Rect; readonly gearHit: Rect },
): Rect {
  if (!rectsIntersect(context.titleRect, context.gearHit)) {
    return display;
  }
  const reserved = rectBottom(context.gearHit) - display.y;
  return { ...display, y: display.y + reserved, height: display.height - reserved };
}

/** The bounding rect of the title of a hub layout. */
function titleRectOf(hub: Pick<HubLayout, 'title' | 'titleStyle'>, width: number): Rect {
  const height = capHeightOf(hub.titleStyle);
  return { x: hub.title.x - Math.floor(width / 2), y: hub.title.y - 2, width, height: height + 4 };
}

/** Moves a stacked hub with its score list below so that the whole composition is centred. */
function centredWithScores(
  hub: Omit<HubLayout, 'gearHit' | 'gear'>,
  region: Rect,
): Omit<HubLayout, 'gearHit' | 'gear'> {
  if (hub.scores === undefined) {
    return hub;
  }
  const top = hub.title.y - 2;
  const height = rectBottom(hub.scores.rect) - top;
  const dy = Math.min(0, region.y + Math.floor((region.height - height) / 2) - top);
  const by = { x: 0, y: dy };
  const { cabinet } = hub;
  return {
    ...hub,
    title: { ...hub.title, y: hub.title.y + dy },
    prompt: { ...hub.prompt, y: hub.prompt.y + dy },
    cabinet: {
      box: translateRect(cabinet.box, by),
      marquee: translateRect(cabinet.marquee, by),
      screen: translateRect(cabinet.screen, by),
      controls: translateRect(cabinet.controls, by),
    },
    scores: { ...hub.scores, rect: translateRect(hub.scores.rect, by) },
  };
}

/** The hub layout (normative rules: stacked by default, side-by-side when the screen gets too small). */
export function computeHubLayout(layout: Layout, input: HubLayoutInput): HubLayout {
  const regions = contentRegions(layout);
  const blocks = hubBlocks(layout, input.title, regions.display);
  const titleWidth = labelWidth(input.title, blocks.titleStyle);
  const gears = gearRects(layout);
  const first = stackedHub(layout, { region: regions.display, blocks });
  const region =
    first === undefined || regions.isSplit
      ? regions.display
      : titleRegion(regions.display, {
          titleRect: titleRectOf(first, titleWidth),
          gearHit: gears.gearHit,
        });
  const hub =
    stackedHub(layout, { region, blocks }) ??
    sideBySideHub({ region: regions.display, blocks, titleWidth });
  const scoreHeight = (rows: number): number => scoreBlockHeight(layout.menuText, rows);
  const beside = scoresBeside(layout, { hub, region, input, scoreHeight });
  if (beside !== undefined || regions.isSplit || hub.kind !== 'stacked') {
    const scores =
      beside ?? scoresBelow(layout, { hub, regions, input, scoreHeight, gearHit: gears.gearHit });
    return { ...hub, ...gears, scores };
  }
  const below = scoresBelow(layout, { hub, regions, input, scoreHeight, gearHit: gears.gearHit });
  return { ...centredWithScores({ ...hub, scores: below }, region), ...gears };
}
