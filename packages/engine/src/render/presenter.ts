import type { LayoutResult } from '../layout/layout-types.ts';
import { notImplemented } from '../util/assert.ts';
import type { Framebuffer } from './framebuffer.ts';

/** The visible canvas and its document. */
export interface PresenterOptions {
  readonly canvas: HTMLCanvasElement;
  readonly document: Document;
}

/** Puts the indexed framebuffer on the canvas at exact device pixels with one integer scale. */
export class CanvasPresenter {
  constructor(_options: PresenterOptions) {
    return notImplemented('engine.CanvasPresenter.constructor');
  }

  /** Applies a layout: backing store = logical × scale, CSS size/offset from the layout, smoothing off. */
  configure(_layout: LayoutResult): void {
    return notImplemented('engine.CanvasPresenter.configure');
  }

  /**
   * framebuffer → LUT → ImageData (logical size, Uint32 view) → putImageData on an offscreen canvas →
   * drawImage scaled by `scale` onto the visible canvas with imageSmoothingEnabled = false.
   */
  present(_framebuffer: Framebuffer, _lut: Uint32Array): void {
    return notImplemented('engine.CanvasPresenter.present');
  }

  /** Releases the offscreen canvas. */
  dispose(): void {
    return notImplemented('engine.CanvasPresenter.dispose');
  }
}
