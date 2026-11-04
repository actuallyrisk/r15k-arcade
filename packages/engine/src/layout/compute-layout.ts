import { notImplemented } from '../util/assert.ts';
import type { LayoutRules } from './layout-rules.ts';
import type { LayoutResult, PlayfieldSpec, ViewportSnapshot } from './layout-types.ts';

/**
 * Picks the arrangement and the largest integer scale for which the framed playfield, its HUD and
 * panels fit the safe area (the preferred arrangement wins over a larger scale).
 */
export function computeLayout(
  _viewport: ViewportSnapshot,
  _playfield: PlayfieldSpec,
  _rules?: LayoutRules,
): LayoutResult {
  return notImplemented('engine.computeLayout');
}
