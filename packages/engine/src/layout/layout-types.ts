import type { Insets, Point, Rect, Size } from '../math/geometry.ts';

/** Orientation of the viewport. */
export type Orientation = 'portrait' | 'landscape';

/** Device posture: flat, half open with a horizontal fold (tabletop) or a vertical fold (book). */
export type Posture = 'flat' | 'tabletop' | 'book';

/** How playfield, HUD and panels are arranged. */
export type Arrangement = 'stacked' | 'sides' | 'banded' | 'tabletop' | 'book';

/** Posture and display segments in CSS px, relative to the viewport. */
export interface PostureInfo {
  readonly posture: Posture;
  readonly segments: readonly Rect[];
}

/** Everything the layout needs to know about the viewport. */
export interface ViewportSnapshot {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly devicePixelRatio: number;
  /** devicePixelContentBoxSize where supported, else round(css × dpr). */
  readonly deviceWidth: number;
  readonly deviceHeight: number;
  /** CSS px (env(safe-area-inset-*), read from the four probes). */
  readonly safeArea: Insets;
  readonly posture: PostureInfo;
}

/** The game's playfield: fixed width, height between the two limits. */
export interface PlayfieldSpec {
  readonly width: number;
  readonly minHeight: number;
  readonly maxHeight: number;
}

/** A font and its zoom chosen by the layout. */
export interface TextChoice {
  readonly font: 'r15k-5' | 'r15k-8';
  readonly zoom: 1 | 2;
}

/** compact: safe CSS width < 360; large: safe CSS width and height ≥ 600; else regular. */
export type SizeClass = 'compact' | 'regular' | 'large';

/** Canvas size, scale and text choices; shared by both layout result kinds. */
export interface CanvasPlacement {
  /** s, integer ≥ 1. */
  readonly scale: number;
  /** k = s / dpr. */
  readonly cssPerLogical: number;
  /** Framebuffer size = floor(device / s). */
  readonly logical: Size;
  /** logical × s. */
  readonly canvasDevice: Size;
  /** floor((device − canvasDevice) / 2). */
  readonly canvasOffsetDevice: Point;
  /** canvasOffsetDevice / dpr, canvasDevice / dpr. */
  readonly canvasCss: Rect;
  /** Logical rect inside the safe area. */
  readonly safe: Rect;
  readonly menuText: TextChoice;
  /** Logical px = ceil(48 × dpr / s). */
  readonly minTouchTarget: number;
  readonly sizeClass: SizeClass;
}

/** A layout that fits the viewport. */
export interface Layout extends CanvasPlacement {
  readonly kind: 'ok';
  readonly orientation: Orientation;
  readonly posture: Posture;
  readonly arrangement: Arrangement;
  /** Playfield interior, width = spec.width. */
  readonly field: Rect;
  /** 1 px outline around the field (field expanded by 1). */
  readonly frame: Rect;
  /** stacked, banded, tabletop, book. */
  readonly hudBand: Rect | undefined;
  /** sides. */
  readonly sidePanels: readonly [Rect, Rect] | undefined;
  /** stacked. */
  readonly bottomPanel: Rect | undefined;
  /** tabletop (upper), book (wider): the segment ∩ safe holding the field. */
  readonly fieldSegment: Rect | undefined;
  /** tabletop (lower segment), book (other segment). */
  readonly segmentPanel: Rect | undefined;
  /** Fold gap plus guard on both sides; nothing interactive or important intersects it. */
  readonly hinge: Rect | undefined;
  readonly hudText: TextChoice;
  /** Menu and HUD text minimums met. */
  readonly isTextReadable: boolean;
}

/** The viewport is too small for the playfield even at scale 1. */
export interface LayoutTooSmall extends CanvasPlacement {
  readonly kind: 'too-small';
}

/** Result of computeLayout. */
export type LayoutResult = Layout | LayoutTooSmall;
