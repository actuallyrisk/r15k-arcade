import {
  computeLayout,
  contentRegions,
  createFakeClock,
  createFakePlatform,
  createIdleInputFrame,
  rectBottom,
  rectRight,
  rectsIntersect,
  REFERENCE_VIEWPORTS,
  referenceSnapshot,
} from '@r15k/engine';
import type { A11yNode, Layout, Rect, RoundResult, Scene, ViewportSnapshot } from '@r15k/engine';
import { BUG_HUNT_GAME } from '@r15k/bug-hunt';
import { expect, test } from 'vitest';
import type { AppServices } from '../boot/app-services.ts';
import { createSnapshotServices } from '../boot/snapshot-services.ts';
import { createDefaultSave } from '../save/save-defaults.ts';
import { createGameOverScene } from './game-over-scene.ts';
import { createHubScene } from './hub-scene.ts';
import { createInitialsScene } from './initials-scene.ts';
import { createPauseScene } from './pause-scene.ts';
import { createSettingsScene } from './settings-scene.ts';
import { createTop10Scene } from './top10-scene.ts';

/** The book posture of the layout examples: a fold opened like a book, Android insets. */
const BOOK: ViewportSnapshot = {
  cssWidth: 673,
  cssHeight: 841,
  devicePixelRatio: 2.625,
  deviceWidth: 1767,
  deviceHeight: 2208,
  safeArea: { top: 24, right: 0, bottom: 16, left: 0 },
  posture: {
    posture: 'book',
    segments: [
      { x: 0, y: 0, width: 336, height: 841 },
      { x: 337, y: 0, width: 336, height: 841 },
    ],
  },
};

/** Every reference viewport plus the book posture. */
const VIEWPORTS: readonly (readonly [string, ViewportSnapshot])[] = [
  ...REFERENCE_VIEWPORTS.map((viewport) => [viewport.id, referenceSnapshot(viewport.id)] as const),
  ['book', BOOK],
];

/** A finished round. */
const RESULT: RoundResult = {
  gameId: 'bug-hunt',
  mode: 'arcade',
  seed: 1,
  score: 120,
  stats: {
    bugsCaught: 120,
    goldenCaught: 0,
    bombsCaught: 0,
    misses: 0,
    bombsDodged: 0,
    bestStreak: 0,
    durationSeconds: 60,
  },
};

/** The scenes checked, by name. */
const SCENES: readonly (readonly [string, (services: AppServices) => Scene])[] = [
  ['hub', createHubScene],
  ['settings', createSettingsScene],
  ['pause', createPauseScene],
  ['game-over', (services) => createGameOverScene(services, { result: RESULT, previousBest: 50 })],
  ['initials', (services) => createInitialsScene(services, { result: RESULT, rank: 1 })],
  ['top10', (services) => createTop10Scene(services, { highlightRank: 1 })],
];

/** Whether `inner` lies completely inside `outer`. */
function isInside(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    rectRight(inner) <= rectRight(outer) &&
    rectBottom(inner) <= rectBottom(outer)
  );
}

/** The interactive mirror nodes of a scene after one idle frame (they sit at the hit rects). */
function interactiveNodes(scene: Scene, layout: Layout): readonly A11yNode[] {
  scene.enter();
  scene.update({
    input: createIdleInputFrame('touch'),
    layout,
    timeMs: 0,
    deltaSeconds: 1 / 60,
    isReducedMotion: false,
    a11yEvents: [],
  });
  return scene
    .a11y()
    .nodes.filter(
      (node) => node.kind !== 'heading' && node.kind !== 'text' && node.kind !== 'list',
    );
}

/** Services with three stored scores. */
function servicesWithScores(): AppServices {
  const fresh = createDefaultSave();
  const arcade = [300, 200, 100].map((score) => ({ initials: 'ABC', score, date: '2026-11-04' }));
  return createSnapshotServices({
    locale: 'de',
    platform: createFakePlatform(),
    clock: createFakeClock(),
    initialDocument: { ...fresh, scores: { bugHunt: { arcade } } },
  });
}

test.each(VIEWPORTS)(
  'every hit rect of every scene is inside safe and off the hinge (%s)',
  (_id, snapshot) => {
    const layout = computeLayout(snapshot, BUG_HUNT_GAME.playfield);
    if (layout.kind !== 'ok') {
      throw new Error('expected a layout');
    }
    for (const [name, create] of SCENES) {
      const nodes = interactiveNodes(create(servicesWithScores()), layout);
      expect(nodes.length, name).toBeGreaterThan(0);
      for (const node of nodes) {
        expect(isInside(node.rect, layout.safe), `${name} ${node.id}`).toBe(true);
        const hinge = layout.hinge;
        expect(hinge !== undefined && rectsIntersect(node.rect, hinge), `${name} ${node.id}`).toBe(
          false,
        );
      }
    }
  },
);

test.each(VIEWPORTS.filter(([id]) => id.startsWith('fold-tabletop') || id === 'book'))(
  'overlay buttons sit in the interaction segment (%s)',
  (_id, snapshot) => {
    const layout = computeLayout(snapshot, BUG_HUNT_GAME.playfield);
    if (layout.kind !== 'ok') {
      throw new Error('expected a layout');
    }
    const regions = contentRegions(layout);
    expect(regions.isSplit).toBe(true);
    for (const [name, create] of SCENES.filter(([id]) => id === 'pause' || id === 'game-over')) {
      for (const node of create(servicesWithScores()).a11y().nodes) {
        expect(isInside(node.rect, regions.interaction), `${name} ${node.id}`).toBe(true);
      }
      for (const node of interactiveNodes(create(servicesWithScores()), layout)) {
        expect(isInside(node.rect, regions.interaction), `${name} ${node.id}`).toBe(true);
      }
    }
  },
);
