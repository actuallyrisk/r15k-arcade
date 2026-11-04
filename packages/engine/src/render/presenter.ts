import type { LayoutResult } from '../layout/layout-types.ts';
import type { Size } from '../math/geometry.ts';
import type { Framebuffer } from './framebuffer.ts';
import { isLittleEndian } from './palette-lut.ts';
import { writeRgba } from './rgba.ts';

/** The visible canvas and its document. */
export interface PresenterOptions {
  readonly canvas: HTMLCanvasElement;
  readonly document: Document;
}

/** The reused logical-size image and its 32-bit view (one RGBA word per pixel). */
interface LogicalImage {
  readonly imageData: ImageData;
  readonly view: Uint32Array;
}

/** An opaque 2D context; throws when the canvas has none. */
function opaqueContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d', { alpha: false });
  if (context === null) {
    throw new Error('CanvasPresenter: no 2D canvas context available');
  }
  return context;
}

/** Sets a canvas backing store size; unchanged sizes are left alone (assigning clears the canvas). */
function setBackingSize(canvas: HTMLCanvasElement, size: Size): void {
  if (canvas.width !== size.width) {
    canvas.width = size.width;
  }
  if (canvas.height !== size.height) {
    canvas.height = size.height;
  }
}

/**
 * Puts the indexed framebuffer on the canvas at exact device pixels with one integer scale. The visible
 * canvas's backing store is `logical × scale` device pixels and its CSS size is backing ÷ DPR (from the
 * layout), so the browser never rescales it. Requires a little-endian platform (the constructor
 * throws otherwise), because the LUT words are written as RGBA bytes.
 */
export class CanvasPresenter {
  readonly #canvas: HTMLCanvasElement;
  readonly #context: CanvasRenderingContext2D;
  readonly #offscreen: HTMLCanvasElement;
  readonly #offscreenContext: CanvasRenderingContext2D;
  #image: LogicalImage | undefined;
  #logical: Size | undefined;
  #scale = 1;
  #isDisposed = false;

  /** Creates the offscreen canvas and both opaque contexts; styles the visible canvas. */
  constructor(options: PresenterOptions) {
    if (!isLittleEndian()) {
      throw new Error('CanvasPresenter: big-endian platforms are not supported');
    }
    this.#canvas = options.canvas;
    this.#context = opaqueContext(options.canvas);
    this.#offscreen = options.document.createElement('canvas');
    this.#offscreenContext = opaqueContext(this.#offscreen);
    this.#canvas.style.position = 'absolute';
    this.#canvas.style.imageRendering = 'pixelated';
  }

  /** Applies a layout: backing store = logical × scale, CSS size/offset from the layout, smoothing off. */
  configure(layout: LayoutResult): void {
    this.#assertUsable();
    setBackingSize(this.#canvas, layout.canvasDevice);
    const { style } = this.#canvas;
    style.width = `${layout.canvasCss.width}px`;
    style.height = `${layout.canvasCss.height}px`;
    style.left = `${layout.canvasCss.x}px`;
    style.top = `${layout.canvasCss.y}px`;
    const previous = this.#logical;
    const { logical } = layout;
    if (previous?.width !== logical.width || previous.height !== logical.height) {
      setBackingSize(this.#offscreen, logical);
      this.#image = this.#createImage(logical);
    }
    this.#logical = { width: logical.width, height: logical.height };
    this.#scale = layout.scale;
    // Resizing a canvas resets its context state, so smoothing is switched off after every configure.
    this.#context.imageSmoothingEnabled = false;
  }

  /**
   * framebuffer → LUT → ImageData (logical size, Uint32 view) → putImageData on an offscreen canvas →
   * drawImage scaled by `scale` onto the visible canvas with imageSmoothingEnabled = false. Throws
   * before `configure`, after `dispose` and for a framebuffer of another size than the layout's.
   */
  present(framebuffer: Framebuffer, lut: Uint32Array): void {
    this.#assertUsable();
    const logical = this.#logical;
    if (logical === undefined) {
      throw new Error('CanvasPresenter: present() before configure()');
    }
    if (framebuffer.width !== logical.width || framebuffer.height !== logical.height) {
      throw new RangeError(
        `CanvasPresenter: framebuffer ${framebuffer.width}×${framebuffer.height} does not match the layout's ${logical.width}×${logical.height}`,
      );
    }
    const image = this.#image;
    if (image === undefined) {
      return;
    }
    writeRgba(framebuffer, lut, image.view);
    this.#offscreenContext.putImageData(image.imageData, 0, 0);
    const width = logical.width * this.#scale;
    const height = logical.height * this.#scale;
    this.#context.drawImage(this.#offscreen, 0, 0, width, height);
  }

  /** Releases the offscreen canvas; the presenter cannot be used afterwards. */
  dispose(): void {
    this.#isDisposed = true;
    this.#image = undefined;
    this.#logical = undefined;
    setBackingSize(this.#offscreen, { width: 0, height: 0 });
  }

  /** The reused image for a logical size (none for an empty size, which presents nothing). */
  #createImage(logical: Size): LogicalImage | undefined {
    if (logical.width === 0 || logical.height === 0) {
      return undefined;
    }
    const imageData = this.#offscreenContext.createImageData(logical.width, logical.height);
    const { buffer, byteOffset, length } = imageData.data;
    return { imageData, view: new Uint32Array(buffer, byteOffset, length / 4) };
  }

  /** Throws after dispose(). */
  #assertUsable(): void {
    if (this.#isDisposed) {
      throw new Error('CanvasPresenter: used after dispose()');
    }
  }
}
