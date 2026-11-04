import { notImplemented } from '@r15k/engine';
import type { Clock, Locale, Platform } from '@r15k/engine';
import type { SaveDocumentV1 } from '../save/save-schema.ts';
import type { AppServices } from './app-services.ts';

/**
 * Fixed app version shown in pixel snapshots, so a release never changes a golden; a display
 * placeholder for goldens only, never a package or release version.
 */
export const SNAPSHOT_APP_VERSION = '0.0.0';

/**
 * Synchronous services for pixel snapshots: a disabled logger, a fake mixer, a memory save store that
 * is never loaded (seeded with `initialDocument`), no-op input, navigation and settings updates.
 */
export function createSnapshotServices(_options: {
  readonly locale: Locale;
  readonly platform: Platform;
  readonly clock: Clock;
  readonly initialDocument?: SaveDocumentV1;
}): AppServices {
  return notImplemented('arcade.createSnapshotServices');
}
