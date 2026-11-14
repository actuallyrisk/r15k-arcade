import {
  computeLayout,
  contentRegions,
  REFERENCE_VIEWPORTS,
  referenceSnapshot,
} from '@r15k/engine';
import type { Layout, ReferenceViewportId } from '@r15k/engine';
import { BUG_HUNT_GAME } from '@r15k/bug-hunt';
import { expect, test } from 'vitest';
import { cabinetHeight, computeHubLayout } from './hub-layout.ts';
import type { HubLayout } from './hub-layout.ts';

/** The layout of a reference viewport. */
function layoutOf(id: ReferenceViewportId): Layout {
  const layout = computeLayout(referenceSnapshot(id), BUG_HUNT_GAME.playfield);
  if (layout.kind !== 'ok') {
    throw new Error(`${id} is too small`);
  }
  return layout;
}

/** The hub of a viewport with three stored scores. */
function hubOf(id: ReferenceViewportId, scoreRows = 3): HubLayout {
  return computeHubLayout(layoutOf(id), { title: 'R15K ARCADE', scoreRows, scoreWidth: 70 });
}

test('cabinet height: marquee, bezels, 4:3 screen, control panel, outline and shadow', () => {
  expect(cabinetHeight(139, 14)).toBe(14 + 8 + 104 + 14 + 4);
  expect(hubOf('phone-landscape').cabinet.screen).toMatchObject({ width: 139, height: 104 });
});

test('worked values: phone-landscape 139 and ultrawide 99, both stacked with scores beside', () => {
  for (const [id, width] of [
    ['phone-landscape', 139],
    ['ultrawide', 99],
  ] as const) {
    const hub = hubOf(id);
    expect(hub.kind, id).toBe('stacked');
    expect(hub.cabinet.screen.width, id).toBe(width);
    expect(hub.scores?.rect.x, id).toBeGreaterThan(hub.cabinet.box.x + hub.cabinet.box.width);
  }
});

test.each(REFERENCE_VIEWPORTS.map((viewport) => viewport.id))(
  'the hub fits its regions (%s)',
  (id) => {
    const layout = layoutOf(id);
    const { display, interaction } = contentRegions(layout);
    const hub = hubOf(id, 10);
    const { box, screen } = hub.cabinet;
    expect(screen.width).toBeGreaterThanOrEqual(64);
    expect(screen.height).toBeGreaterThanOrEqual(48);
    expect(box.x).toBeGreaterThanOrEqual(display.x);
    expect(box.y).toBeGreaterThanOrEqual(display.y);
    expect(box.y + box.height + 3).toBeLessThanOrEqual(display.y + display.height);
    expect(hub.gearHit.width).toBeGreaterThanOrEqual(layout.minTouchTarget);
    expect(hub.gearHit.x + hub.gearHit.width).toBeLessThanOrEqual(
      interaction.x + interaction.width,
    );
    if (layout.sizeClass === 'compact') {
      expect(hub.scores).toBeUndefined();
    }
  },
);

test('large layouts show the full top 10 when it fits, regular ones the top 3', () => {
  expect(hubOf('desktop', 10).scores?.rows).toBe(10);
  expect(hubOf('phone-portrait', 10).scores?.rows).toBe(3);
  expect(hubOf('desktop', 0).scores).toBeUndefined();
});
