import type { Locale } from '../i18n/catalog.ts';
import type { Rect } from '../math/geometry.ts';
import { notImplemented } from '../util/assert.ts';
import type { A11yEvent, A11yTree } from './a11y-types.ts';

/** Construction options of the mirror layer. */
export interface A11yMirrorOptions {
  /** #a11y-root. */
  readonly root: HTMLElement;
  readonly document: Document;
  /** logicalToCss bound to the current layout. */
  readonly toCss: (rect: Rect) => Rect;
  /** The app queues the event and wakes the loop. */
  readonly onEvent: (event: A11yEvent) => void;
}

/** A live message is cleared, then set this many milliseconds later (repeated texts are re-read). */
export const ANNOUNCE_CLEAR_MS = 80;

/** A polite message stays at least this long before the next one. */
export const ANNOUNCE_MIN_SPACING_MS = 500;

/** Invisible DOM layer that mirrors every pixel widget for assistive technology. */
export class A11yMirror {
  constructor(_options: A11yMirrorOptions) {
    return notImplemented('engine.A11yMirror.constructor');
  }

  /** Keyed diff by node id; cheap enough every frame. */
  sync(_tree: A11yTree): void {
    return notImplemented('engine.A11yMirror.sync');
  }

  /** Queues a live announcement. */
  announce(_text: string, _politeness?: 'polite' | 'assertive'): void {
    return notImplemented('engine.A11yMirror.announce');
  }

  /** Sets `<html lang>`. */
  setLocale(_locale: Locale): void {
    return notImplemented('engine.A11yMirror.setLocale');
  }

  /** Replaces the logical-to-CSS mapping after a layout change. */
  setLayoutMapper(_toCss: (rect: Rect) => Rect): void {
    return notImplemented('engine.A11yMirror.setLayoutMapper');
  }

  /** Removes the mirror elements. */
  dispose(): void {
    return notImplemented('engine.A11yMirror.dispose');
  }
}
