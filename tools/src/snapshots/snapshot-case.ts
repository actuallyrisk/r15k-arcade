// R15K Arcade tools – the contract of a pixel snapshot case: what a case draws with and how scenes are
// run in the harness (60 Hz frames with two fixed steps each).
import type {
  CatalogPair,
  DrawTarget,
  FakeClock,
  FakePlatform,
  InputFrame,
  LayoutResult,
  Locale,
  ReferenceViewportId,
  Scene,
  Translator,
  ViewportSnapshot,
} from '@r15k/engine';
import type { PaletteId, UiFonts } from '@r15k/ui';

/** What a snapshot case draws with. */
export interface SnapshotEnvironment {
  readonly target: DrawTarget;
  /** 'too-small' for the too-small case, else a Layout. */
  readonly layout: LayoutResult;
  readonly fonts: UiFonts;
  readonly i18n: Translator;
  readonly clock: FakeClock;
  readonly platform: FakePlatform;
  /** Runs a scene for `frames` 60 Hz frames, then renders it once; throws for a too-small layout. */
  runScene(scene: Scene, options: { readonly frames: number; readonly input?: InputFrame }): void;
}

/** One pixel snapshot, rendered in every palette it lists. */
export interface SnapshotCase {
  /** 'ui-…' | 'bug-hunt-…' | 'arcade-…' (the prefix names the owner). */
  readonly id: string;
  /** A reference viewport or a custom snapshot (e.g. the too-small case). */
  readonly viewport: ReferenceViewportId | ViewportSnapshot;
  readonly locale: Locale;
  /** Catalogs of the harness translator. */
  readonly catalogs: readonly CatalogPair[];
  /** Default all four. */
  readonly palettes?: readonly PaletteId[];
  draw(environment: SnapshotEnvironment): void;
}
