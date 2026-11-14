import type { PostureInfo } from '../layout/layout-types.ts';
import { postureFromSegments } from '../layout/segments.ts';
import type { Unsubscribe } from '../util/emitter.ts';
import type { PostureCapability } from './platform-types.ts';

/** The Viewport Segments API (`window.viewport.segments`), not yet in the DOM types. */
interface SegmentedWindow {
  readonly viewport?: { readonly segments?: readonly DOMRectReadOnly[] | null };
}

/** Media queries whose match changes when the viewport splits into two segments or joins again. */
const SEGMENT_QUERIES = ['(horizontal-viewport-segments: 2)', '(vertical-viewport-segments: 2)'];

/**
 * Posture from the Viewport Segments API: two segments stacked vertically → tabletop, side by side →
 * book, else flat.
 */
export function createWebPosture(window: Window): PostureCapability {
  const segmented = window as Window & SegmentedWindow;
  const current = (): PostureInfo => {
    const segments = segmented.viewport?.segments ?? [];
    return postureFromSegments(
      segments.map(({ x, y, width, height }) => ({ x, y, width, height })),
    );
  };
  return {
    isAvailable: Array.isArray(segmented.viewport?.segments),
    current,
    subscribe(listener: (info: PostureInfo) => void): Unsubscribe {
      const queries = SEGMENT_QUERIES.map((query) => window.matchMedia(query));
      const onChange = (): void => {
        listener(current());
      };
      for (const query of queries) {
        query.addEventListener('change', onChange);
      }
      return () => {
        for (const query of queries) {
          query.removeEventListener('change', onChange);
        }
      };
    },
  };
}
