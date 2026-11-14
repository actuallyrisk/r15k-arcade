// R15K Arcade tools – renders the app icon sprite to RGBA: nearest-neighbour integer scaling (pixel art
// stays sharp), palette slot 0 fully transparent, every other slot through the palette LUT; and places an
// image centred on a larger transparent canvas (the Windows wide logo).
import type { CompiledSprite, Size } from '@r15k/engine';
import type { RgbaImage } from '../png/png-encode.ts';

/** Scale of the 32 × 32 icon sprite to the 1024 × 1024 source image of `tauri icon`. */
export const ICON_SCALE = 32;

/** The Windows wide logo: canvas size and the scale of the icon centred on it. */
export const WIDE_LOGO = { width: 310, height: 150, iconScale: 4 } as const;

/** RGBA bytes of a LUT entry (0xAABBGGRR); slot 0 is transparent. */
function slotColor(lut: Uint32Array, slot: number): readonly [number, number, number, number] {
  if (slot === 0) {
    return [0, 0, 0, 0];
  }
  const entry = lut[slot] ?? 0;
  return [entry & 0xff, (entry >>> 8) & 0xff, (entry >>> 16) & 0xff, entry >>> 24];
}

/** Frame 0 of a sprite scaled by an integer factor (nearest neighbour). */
export function renderIcon(
  sprite: CompiledSprite,
  options: { readonly lut: Uint32Array; readonly scale: number },
): RgbaImage {
  const { scale, lut } = options;
  const frame = sprite.frames[0] ?? new Uint8Array(sprite.width * sprite.height);
  const width = sprite.width * scale;
  const height = sprite.height * scale;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const slot = frame[Math.floor(y / scale) * sprite.width + Math.floor(x / scale)] ?? 0;
      data.set(slotColor(lut, slot), (y * width + x) * 4);
    }
  }
  return { width, height, data };
}

/** The image centred (rounded down) on a transparent canvas of `size`. */
export function placeCentred(image: RgbaImage, size: Size): RgbaImage {
  if (image.width > size.width || image.height > size.height) {
    throw new Error(`${image.width}×${image.height} does not fit on ${size.width}×${size.height}`);
  }
  const data = new Uint8Array(size.width * size.height * 4);
  const left = Math.floor((size.width - image.width) / 2);
  const top = Math.floor((size.height - image.height) / 2);
  for (let y = 0; y < image.height; y += 1) {
    const row = image.data.subarray(y * image.width * 4, (y + 1) * image.width * 4);
    data.set(row, ((top + y) * size.width + left) * 4);
  }
  return { width: size.width, height: size.height, data };
}
