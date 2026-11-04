import type { Insets, Rect } from '../math/geometry.ts';
import { notImplemented } from '../util/assert.ts';
import type { ViewportSnapshot } from './layout-types.ts';

/** Identifier of a reference viewport. */
export type ReferenceViewportId =
  | 'phone-portrait'
  | 'phone-landscape'
  | 'fold-cover'
  | 'fold-open'
  | 'fold-tabletop'
  | 'fold-tabletop-l'
  | 'tablet-portrait'
  | 'tablet-landscape'
  | 'handheld'
  | 'desktop'
  | 'ultrawide';

/** A reference device: the single source for layout tests, pixel snapshots and E2E projects. */
export interface ReferenceViewport {
  readonly id: ReferenceViewportId;
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly devicePixelRatio: number;
  readonly safeArea: Insets;
  readonly segments: readonly Rect[];
  readonly isMobile: boolean;
  readonly hasTouch: boolean;
}

const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
const ANDROID_INSETS: Insets = { top: 24, right: 0, bottom: 16, left: 0 };
const IPAD_INSETS: Insets = { top: 0, right: 0, bottom: 20, left: 0 };

/** Every reference viewport, in the order of the E2E projects. */
export const REFERENCE_VIEWPORTS: readonly ReferenceViewport[] = [
  {
    id: 'phone-portrait',
    cssWidth: 390,
    cssHeight: 844,
    devicePixelRatio: 3,
    safeArea: { top: 47, right: 0, bottom: 34, left: 0 },
    segments: [],
    isMobile: true,
    hasTouch: true,
  },
  {
    id: 'phone-landscape',
    cssWidth: 844,
    cssHeight: 390,
    devicePixelRatio: 3,
    safeArea: { top: 0, right: 47, bottom: 21, left: 47 },
    segments: [],
    isMobile: true,
    hasTouch: true,
  },
  {
    id: 'fold-cover',
    cssWidth: 344,
    cssHeight: 882,
    devicePixelRatio: 2.625,
    safeArea: ANDROID_INSETS,
    segments: [],
    isMobile: true,
    hasTouch: true,
  },
  {
    id: 'fold-open',
    cssWidth: 673,
    cssHeight: 841,
    devicePixelRatio: 2.625,
    safeArea: ANDROID_INSETS,
    segments: [],
    isMobile: true,
    hasTouch: true,
  },
  {
    id: 'fold-tabletop',
    cssWidth: 673,
    cssHeight: 841,
    devicePixelRatio: 2.625,
    safeArea: ANDROID_INSETS,
    segments: [
      { x: 0, y: 0, width: 673, height: 420 },
      { x: 0, y: 421, width: 673, height: 420 },
    ],
    isMobile: true,
    hasTouch: true,
  },
  {
    id: 'fold-tabletop-l',
    cssWidth: 841,
    cssHeight: 673,
    devicePixelRatio: 2.625,
    safeArea: ANDROID_INSETS,
    segments: [
      { x: 0, y: 0, width: 841, height: 336 },
      { x: 0, y: 337, width: 841, height: 336 },
    ],
    isMobile: true,
    hasTouch: true,
  },
  {
    id: 'tablet-portrait',
    cssWidth: 820,
    cssHeight: 1180,
    devicePixelRatio: 2,
    safeArea: IPAD_INSETS,
    segments: [],
    isMobile: true,
    hasTouch: true,
  },
  {
    id: 'tablet-landscape',
    cssWidth: 1180,
    cssHeight: 820,
    devicePixelRatio: 2,
    safeArea: IPAD_INSETS,
    segments: [],
    isMobile: true,
    hasTouch: true,
  },
  {
    id: 'handheld',
    cssWidth: 1280,
    cssHeight: 800,
    devicePixelRatio: 1,
    safeArea: NO_INSETS,
    segments: [],
    isMobile: false,
    hasTouch: true,
  },
  {
    id: 'desktop',
    cssWidth: 1440,
    cssHeight: 900,
    devicePixelRatio: 2,
    safeArea: NO_INSETS,
    segments: [],
    isMobile: false,
    hasTouch: false,
  },
  {
    id: 'ultrawide',
    cssWidth: 2560,
    cssHeight: 1080,
    devicePixelRatio: 1,
    safeArea: NO_INSETS,
    segments: [],
    isMobile: false,
    hasTouch: false,
  },
];

/** The viewport snapshot of a reference viewport (posture derived from its segments). */
export function referenceSnapshot(_id: ReferenceViewportId): ViewportSnapshot {
  return notImplemented('engine.referenceSnapshot');
}
