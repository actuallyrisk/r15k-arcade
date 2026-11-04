import { fitArrangement, framedBoxWidth } from './arrangements.ts';
import type { ArrangementGeometry } from './arrangements.ts';
import { DEFAULT_LAYOUT_RULES } from './layout-rules.ts';
import type { LayoutRules } from './layout-rules.ts';
import type {
  Arrangement,
  Layout,
  LayoutResult,
  Orientation,
  PlayfieldSpec,
  PostureInfo,
  ViewportSnapshot,
} from './layout-types.ts';
import { scaleContext } from './scale-context.ts';
import type { ScaleContext } from './scale-context.ts';
import { postureFromSegments } from './segments.ts';

/** Arrangements in the order they are tried: a folded posture first, then the flat chain. */
function arrangementChain(orientation: Orientation, posture: PostureInfo): readonly Arrangement[] {
  const flat: readonly Arrangement[] =
    orientation === 'landscape' ? ['sides', 'banded'] : ['stacked', 'banded'];
  switch (posture.posture) {
    case 'tabletop':
      return ['tabletop', ...flat];
    case 'book':
      return ['book', ...flat];
    case 'flat':
      return flat;
  }
}

/** The layout of one fitting (arrangement, scale) pair. */
function toLayout(
  context: ScaleContext,
  frame: {
    readonly orientation: Orientation;
    readonly posture: PostureInfo;
    readonly arrangement: Arrangement;
  },
  geometry: ArrangementGeometry,
): Layout {
  return {
    kind: 'ok',
    ...context.placement,
    orientation: frame.orientation,
    posture: frame.posture.posture,
    arrangement: frame.arrangement,
    ...geometry,
    hudText: context.hud.candidate.choice,
    isTextReadable: context.hud.isReadable && context.menu.isReadable,
  };
}

/**
 * Picks the arrangement and the largest integer scale for which the framed playfield, its HUD and
 * panels fit the safe area (the preferred arrangement wins over a larger scale).
 */
export function computeLayout(
  viewport: ViewportSnapshot,
  playfield: PlayfieldSpec,
  rules: LayoutRules = DEFAULT_LAYOUT_RULES,
): LayoutResult {
  const orientation: Orientation =
    viewport.cssWidth >= viewport.cssHeight ? 'landscape' : 'portrait';
  const posture = postureFromSegments(viewport.posture.segments);
  const maxScale = Math.floor(viewport.deviceWidth / framedBoxWidth(playfield, rules));
  for (const arrangement of arrangementChain(orientation, posture)) {
    for (let scale = maxScale; scale >= 1; scale -= 1) {
      const context = scaleContext(viewport, scale, rules);
      const input = { spec: playfield, rules, context, segments: posture.segments };
      const geometry = fitArrangement(arrangement, input);
      if (geometry !== undefined) {
        return toLayout(context, { orientation, posture, arrangement }, geometry);
      }
    }
  }
  return { kind: 'too-small', ...scaleContext(viewport, 1, rules).placement };
}
