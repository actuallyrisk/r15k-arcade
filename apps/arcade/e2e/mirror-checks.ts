// R15K Arcade – E2E checks of the accessibility mirror: every node inside the viewport and off the
// hinge, every interactive node at least 44 × 44 CSS px, the round's pause button on the touch half.
import { expect } from '@playwright/test';
import { computeLayout, logicalToCss, referenceSnapshot } from '@r15k/engine';
import type { Rect } from '@r15k/engine';
import { TUNING } from '@r15k/bug-hunt';
import type { AppFixture } from './fixtures.ts';

/** Smallest touch target (CSS px) of an interactive mirror element. */
const MIN_TARGET_CSS = 44;
/** Rounding tolerance of CSS rects (px). */
const EPSILON = 0.5;

/** One mirror element as the page lays it out. */
interface MirrorBox extends Rect {
  readonly id: string;
  readonly tag: string;
  readonly role: string | null;
}

/** Every mirror element with a node id, with its CSS rect. */
async function mirrorBoxes(app: AppFixture): Promise<readonly MirrorBox[]> {
  return app.page.evaluate(() =>
    Array.from(document.querySelectorAll('#a11y-root [data-a11y-id]'), (element) => {
      const rect = element.getBoundingClientRect();
      const id = element.getAttribute('data-a11y-id') ?? '';
      return {
        id,
        tag: element.tagName,
        role: element.getAttribute('role'),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    }),
  );
}

/** The hinge of an emulated fold in CSS px (undefined without one). */
export function hingeCss(app: AppFixture): Rect | undefined {
  if (!app.isSegmentEmulated) {
    return undefined;
  }
  const layout = computeLayout(referenceSnapshot(app.viewport.id), TUNING.field);
  return layout.kind === 'ok' && layout.hinge !== undefined
    ? logicalToCss(layout, layout.hinge)
    : undefined;
}

/** Whether two rects overlap (touching edges do not count). */
function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width - EPSILON &&
    b.x < a.x + a.width - EPSILON &&
    a.y < b.y + b.height - EPSILON &&
    b.y < a.y + a.height - EPSILON
  );
}

/** Checks the mirror of the current scene. */
export async function expectGoodMirror(app: AppFixture, scene: string): Promise<void> {
  const boxes = await mirrorBoxes(app);
  expect(boxes.length, scene).toBeGreaterThan(0);
  const { cssWidth, cssHeight } = app.viewport;
  const hinge = hingeCss(app);
  for (const box of boxes) {
    const label = `${scene}: ${box.id}`;
    expect(box.x >= -EPSILON && box.y >= -EPSILON, label).toBe(true);
    expect(
      box.x + box.width <= cssWidth + EPSILON && box.y + box.height <= cssHeight + EPSILON,
      label,
    ).toBe(true);
    if (['BUTTON', 'INPUT'].includes(box.tag) || box.role === 'spinbutton') {
      expect(Math.min(box.width, box.height), label).toBeGreaterThanOrEqual(
        MIN_TARGET_CSS - EPSILON,
      );
    }
    if (hinge !== undefined) {
      expect(overlaps(box, hinge), label).toBe(false);
    }
  }
}

/** On an emulated fold, the pause button of the round lies in the lower segment. */
export async function expectPauseOnTouchHalf(app: AppFixture, pauseId: string): Promise<void> {
  const hinge = hingeCss(app);
  if (hinge === undefined) {
    return;
  }
  const pause = (await mirrorBoxes(app)).find((box) => box.id === pauseId);
  expect(pause, pauseId).toBeDefined();
  expect(pause?.y ?? 0).toBeGreaterThanOrEqual(hinge.y + hinge.height - EPSILON);
}
