import { notImplemented } from '../util/assert.ts';
import type { PostureCapability } from './platform-types.ts';

/**
 * Posture from the Viewport Segments API: two segments stacked vertically → tabletop, side by side →
 * book, else flat.
 */
export function createWebPosture(_window: Window): PostureCapability {
  return notImplemented('engine.createWebPosture');
}
