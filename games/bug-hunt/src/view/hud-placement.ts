import { DEFAULT_LAYOUT_RULES, rectBottom, rectRight } from '@r15k/engine';
import type { Layout, Rect } from '@r15k/engine';
import { TUNING } from '../content/tuning.ts';
import { capHeightOf } from './text-styles.ts';

/** Where the round HUD goes in a layout (all rects in logical canvas px). */
export interface HudPlacement {
  readonly score: Rect;
  readonly time: Rect;
  readonly best: Rect;
  readonly combo: Rect;
  /** The drawn pause square, centred in its hit rect. */
  readonly pause: Rect;
  /** At least minTouchTarget², inside layout.safe, never intersecting layout.hinge. */
  readonly pauseHit: Rect;
  /** stacked/banded/tabletop/book: 1 px line at the bottom row of the HUD band. */
  readonly timeBar: Rect | undefined;
  /** Touch only (text bugHunt.hint.drag): tabletop segment panel, stacked bottom panel when high enough. */
  readonly dragHint: Rect | undefined;
  /** sides: the two side panels; book: the halves of the segment panel. */
  readonly holdAreas: readonly [Rect, Rect] | undefined;
  /** True when score, time and best are drawn on the ink HUD band. */
  readonly isOnInk: boolean;
}

const PAD = TUNING.hud.edgePadding;
const GUTTER = DEFAULT_LAYOUT_RULES.gutter;
/** The hard shadow of a panel (drawPanel default offset). */
const PANEL_SHADOW = 3;
/** The hard shadow of a UI button. */
const BUTTON_SHADOW = 2;
/** Space the pause button keeps to its panel border: padding plus the button's own hard shadow. */
const BUTTON_MARGIN = PAD + BUTTON_SHADOW;

/** A layout part the arrangement guarantees; a missing one is a layout bug. */
function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) {
    throw new Error(`round HUD: layout without ${what}`);
  }
  return value;
}

/** Score left, time centred, best right: one third of the band each, on the band's text line. */
function bandThirds(layout: Layout, band: Rect): Pick<HudPlacement, 'score' | 'time' | 'best'> {
  const cap = capHeightOf(layout.hudText);
  const y = band.y + Math.floor((band.height - cap) / 2);
  const third = Math.floor(band.width / 3);
  return {
    score: { x: band.x + PAD, y, width: third - PAD, height: cap },
    time: { x: band.x + third, y, width: band.width - 2 * third, height: cap },
    best: { x: rectRight(band) - third, y, width: third - PAD, height: cap },
  };
}

/** The 1 px time bar on the band's bottom row. */
function timeBarOf(band: Rect): Rect {
  return { x: band.x, y: rectBottom(band) - 1, width: band.width, height: 1 };
}

/**
 * The pause button: the drawn square fits a menu glyph with padding (never more than `room`), and its
 * hit rect is at least the minimum touch target and never smaller than the square.
 */
function pauseSizes(layout: Layout, room: number): { readonly side: number; readonly hit: number } {
  const side = Math.min(capHeightOf(layout.menuText) + 2 * PAD + 2, room);
  return { side, hit: Math.max(layout.minTouchTarget, side) };
}

/** The hit rect of `size` centred on a drawn square, moved as needed to stay inside `region`. */
function hitAround(square: Rect, size: number, region: Rect): Rect {
  const offset = Math.floor((size - square.width) / 2);
  return {
    x: Math.min(Math.max(square.x - offset, region.x), rectRight(region) - size),
    y: Math.min(Math.max(square.y - offset, region.y), rectBottom(region) - size),
    width: size,
    height: size,
  };
}

/** A square of `side` centred in the hit rect. */
function centredSquare(hit: Rect, side: number): Rect {
  return {
    x: hit.x + Math.floor((hit.width - side) / 2),
    y: hit.y + Math.floor((hit.height - side) / 2),
    width: side,
    height: side,
  };
}

/**
 * The paper panel drawn behind combo, pause button and drag hint: the stacked bottom panel (it starts
 * below the field's shadow and gutter) or the segment panel inset by the gutter, each leaving room for
 * the panel's hard shadow; undefined for sides and banded.
 */
export function roundPanelRect(layout: Layout): Rect | undefined {
  const bottom = layout.arrangement === 'stacked' ? layout.bottomPanel : undefined;
  if (bottom !== undefined) {
    const height = bottom.height - PANEL_SHADOW - GUTTER;
    return { ...bottom, width: bottom.width - PANEL_SHADOW, height };
  }
  const segment = layout.segmentPanel;
  if (segment === undefined) {
    return undefined;
  }
  return {
    x: segment.x + GUTTER,
    y: segment.y + GUTTER,
    width: segment.width - 2 * GUTTER - PANEL_SHADOW,
    height: segment.height - 2 * GUTTER - PANEL_SHADOW,
  };
}

/** Combo line at the top left of a panel, up to `right`. */
function comboIn(layout: Layout, panel: Rect, right: number): Rect {
  return {
    x: panel.x + PAD,
    y: panel.y + PAD,
    width: right - panel.x - 2 * PAD,
    height: capHeightOf(layout.hudText),
  };
}

/** The drag hint area: below the combo line and left of or above the pause button. */
function hintArea(panel: Rect, combo: Rect, bottom: number): Rect {
  const top = rectBottom(combo) + PAD;
  return { x: panel.x + PAD, y: top, width: panel.width - 2 * PAD, height: bottom - PAD - top };
}

/** stacked: band on top, combo, pause and drag hint in the paper panel below the field. */
function stackedPlacement(layout: Layout): HudPlacement {
  const band = required(layout.hudBand, 'hudBand');
  const bottom = required(layout.bottomPanel, 'bottomPanel');
  const panel = required(roundPanelRect(layout), 'bottom panel');
  const { side, hit: size } = pauseSizes(layout, panel.height - 2 * GUTTER - BUTTON_SHADOW);
  const pause = {
    x: rectRight(panel) - BUTTON_MARGIN - side,
    y: panel.y + Math.floor((panel.height - side) / 2),
    width: side,
    height: side,
  };
  const pauseHit = hitAround(pause, size, bottom);
  const combo = comboIn(layout, panel, pauseHit.x);
  const isHintRoom = bottom.height >= TUNING.hud.dragHintMinHeight;
  const hint = hintArea({ ...panel, width: pauseHit.x - panel.x }, combo, rectBottom(panel));
  return {
    ...bandThirds(layout, band),
    combo,
    pause,
    pauseHit,
    timeBar: timeBarOf(band),
    dragHint: isHintRoom ? hint : undefined,
    holdAreas: undefined,
    isOnInk: true,
  };
}

/** banded: everything in the band; the pause hit rect hangs from the band's top-right corner. */
function bandedPlacement(layout: Layout): HudPlacement {
  const band = required(layout.hudBand, 'hudBand');
  const thirds = bandThirds(layout, band);
  const pause = {
    x: rectRight(band) - band.height,
    y: band.y,
    width: band.height,
    height: band.height,
  };
  const size = Math.max(layout.minTouchTarget, band.height);
  const right = { ...thirds.best, width: pause.x - PAD - thirds.best.x };
  const comboWidth = Math.floor(right.width / 3);
  return {
    ...thirds,
    combo: { ...right, width: comboWidth },
    best: { ...right, x: right.x + comboWidth, width: right.width - comboWidth },
    pause,
    pauseHit: { x: rectRight(band) - size, y: band.y, width: size, height: size },
    timeBar: timeBarOf(band),
    dragHint: undefined,
    holdAreas: undefined,
    isOnInk: true,
  };
}

/** sides: score and combo in the left panel, time, best and pause in the right one (ink on grid paper). */
function sidesPlacement(layout: Layout): HudPlacement {
  const [left, right] = required(layout.sidePanels, 'sidePanels');
  const cap = capHeightOf(layout.hudText);
  const block = cap + PAD + 2 * cap;
  const top = layout.field.y + PAD;
  const { side, hit: size } = pauseSizes(layout, right.width - 2 * PAD);
  const pauseHit = {
    x: right.x + Math.floor((right.width - size) / 2),
    y: rectBottom(right) - size - Math.min(PAD, right.height - size),
    width: size,
    height: size,
  };
  const score = { x: left.x, y: top, width: left.width, height: block };
  const time = { x: right.x, y: top, width: right.width, height: block };
  return {
    score,
    time,
    best: { ...time, y: rectBottom(time) + 2 * PAD },
    combo: { ...score, y: rectBottom(score) + 2 * PAD, height: 3 * cap + 2 * PAD },
    pause: centredSquare(pauseHit, side),
    pauseHit,
    timeBar: undefined,
    dragHint: undefined,
    holdAreas: [left, right],
    isOnInk: false,
  };
}

/** tabletop and book: band in the field segment, combo and pause in the segment panel. */
function segmentPlacement(layout: Layout, isBook: boolean): HudPlacement {
  const band = required(layout.hudBand, 'hudBand');
  const segment = required(layout.segmentPanel, 'segmentPanel');
  const panel = required(roundPanelRect(layout), 'segment panel');
  const { side, hit: size } = pauseSizes(layout, panel.height - 2 * BUTTON_MARGIN);
  const pause = {
    x: rectRight(panel) - BUTTON_MARGIN - side,
    y: rectBottom(panel) - BUTTON_MARGIN - side,
    width: side,
    height: side,
  };
  const pauseHit = hitAround(pause, size, segment);
  const combo = comboIn(layout, panel, rectRight(panel));
  const halfWidth = Math.floor(segment.width / 2);
  return {
    ...bandThirds(layout, band),
    combo,
    pause,
    pauseHit,
    timeBar: timeBarOf(band),
    dragHint: isBook ? undefined : hintArea(panel, combo, pauseHit.y),
    holdAreas: isBook
      ? [
          { ...segment, width: halfWidth },
          { ...segment, x: segment.x + halfWidth, width: segment.width - halfWidth },
        ]
      : undefined,
    isOnInk: true,
  };
}

/** The HUD placement of a round for every arrangement. */
export function roundHudPlacement(layout: Layout): HudPlacement {
  switch (layout.arrangement) {
    case 'stacked':
      return stackedPlacement(layout);
    case 'banded':
      return bandedPlacement(layout);
    case 'sides':
      return sidesPlacement(layout);
    case 'tabletop':
      return segmentPlacement(layout, false);
    case 'book':
      return segmentPlacement(layout, true);
  }
}
