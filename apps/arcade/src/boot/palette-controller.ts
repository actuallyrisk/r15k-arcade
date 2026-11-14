import { getPaletteLut, PALETTES } from '@r15k/ui';
import type { PaletteId } from '@r15k/ui';

/** The active palette: its LUT for the presenter and the matching page background. */
export interface PaletteController {
  /** Switches the LUT, sets `--r15k-paper` on the root element and reports the change. */
  apply(id: PaletteId): void;
  /** The LUT the frame driver presents with. */
  readonly lut: Uint32Array;
}

/**
 * Creates the palette controller (light until the first `apply`). It touches neither the presenter
 * nor the loop, so it can be created after both; `onChanged` wakes the loop.
 */
export function createPaletteController(options: {
  readonly document: Document;
  readonly onChanged: () => void;
}): PaletteController {
  let paletteId: PaletteId = 'light';
  return {
    apply(id) {
      paletteId = id;
      options.document.documentElement.style.setProperty(
        '--r15k-paper',
        PALETTES[id].bodyBackground,
      );
      options.onChanged();
    },
    get lut() {
      return getPaletteLut(paletteId);
    },
  };
}
