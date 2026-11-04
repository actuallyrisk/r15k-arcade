// R15K Arcade tools – renders a snapshot case into the indexed framebuffer in Node. Everything from other
// packages (palette LUT, fonts, translator, fake platform, layout) is resolved inside the call, so
// importing the harness evaluates none of it.
import { notImplemented } from '@r15k/engine';
import type { PaletteId } from '@r15k/ui';
import type { RgbaImage } from '../png/png-encode.ts';
import type { SnapshotCase } from './snapshot-case.ts';

/** Renders one case in one palette. */
export function renderSnapshot(_snapshotCase: SnapshotCase, _palette: PaletteId): RgbaImage {
  return notImplemented('tools.renderSnapshot');
}
