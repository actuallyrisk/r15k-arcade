import type { TextChoice } from './layout-types.ts';

/** A text choice with its cap height and the HUD band height it needs, in logical px. */
export interface TextCandidate {
  readonly choice: TextChoice;
  readonly capHeight: number;
  readonly bandHeight: number;
}

/** Tunable constants of the layout algorithm. */
export interface LayoutRules {
  /** Minimum distance of the framed box to edges and panels. */
  readonly gutter: number;
  readonly sidePanelMinWidth: number;
  /** HUD digits. */
  readonly minHudCssPx: number;
  /** Menu and body text. */
  readonly minMenuCssPx: number;
  /** ≥ 44 pt iOS, = 48 dp Android. */
  readonly minTouchCssPx: number;
  /** Kept clear on both sides of a fold line (real folds report maskLength 0). */
  readonly hingeGuardCssPx: number;
  /** Safe width below this → sizeClass 'compact' (cover screens, Slide Over). */
  readonly compactMaxCssWidth: number;
  /** Safe width and height at least this → 'large' (tablets, desktops). */
  readonly largeMinCssSide: number;
  /** The first candidate that meets minHudCssPx is used. */
  readonly hudCandidates: readonly TextCandidate[];
  /** The first candidate that meets minMenuCssPx is used; the last one when none does. */
  readonly menuCandidates: readonly TextCandidate[];
}

/** The layout rules of the arcade. */
export const DEFAULT_LAYOUT_RULES: LayoutRules = {
  gutter: 2,
  sidePanelMinWidth: 56,
  minHudCssPx: 7,
  minMenuCssPx: 10,
  minTouchCssPx: 48,
  hingeGuardCssPx: 8,
  compactMaxCssWidth: 360,
  largeMinCssSide: 600,
  hudCandidates: [
    { choice: { font: 'r15k-5', zoom: 1 }, capHeight: 5, bandHeight: 11 },
    { choice: { font: 'r15k-8', zoom: 1 }, capHeight: 8, bandHeight: 14 },
    { choice: { font: 'r15k-8', zoom: 2 }, capHeight: 16, bandHeight: 22 },
  ],
  menuCandidates: [
    { choice: { font: 'r15k-8', zoom: 1 }, capHeight: 8, bandHeight: 14 },
    { choice: { font: 'r15k-8', zoom: 2 }, capHeight: 16, bandHeight: 22 },
  ],
};
