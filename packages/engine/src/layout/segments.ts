// Posture derived from display segments, shared by the layout, the reference viewports and the web
// posture capability, so every producer classifies a fold the same way.
import { rectBottom, rectRight } from '../math/geometry.ts';
import type { Rect } from '../math/geometry.ts';
import type { PostureInfo } from './layout-types.ts';

const FLAT: PostureInfo = { posture: 'flat', segments: [] };

/**
 * Two segments stacked vertically → tabletop (upper segment first), side by side → book (left segment
 * first); anything else is flat without segments. Touching segments (a fold reported with mask length 0)
 * still count as two segments.
 */
export function postureFromSegments(segments: readonly Rect[]): PostureInfo {
  const [first, second] = segments;
  if (segments.length !== 2 || first === undefined || second === undefined) {
    return FLAT;
  }
  const [upper, lower] = first.y <= second.y ? [first, second] : [second, first];
  if (rectBottom(upper) <= lower.y) {
    return { posture: 'tabletop', segments: [upper, lower] };
  }
  const [left, right] = first.x <= second.x ? [first, second] : [second, first];
  if (rectRight(left) <= right.x) {
    return { posture: 'book', segments: [left, right] };
  }
  return FLAT;
}
