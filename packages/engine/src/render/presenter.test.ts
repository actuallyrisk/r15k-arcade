import { expect, test } from 'vitest';
import type { LayoutResult } from '../layout/layout-types.ts';
import { createFramebuffer } from './framebuffer.ts';
import { CanvasPresenter } from './presenter.ts';

/** What a fake 2D context was asked to do. */
interface FakeContext {
  isSmoothing: boolean;
  readonly options: unknown[];
  readonly images: {
    readonly width: number;
    readonly height: number;
    readonly data: Uint8ClampedArray;
  }[];
  readonly puts: unknown[];
  readonly draws: unknown[][];
}

/** A canvas whose 2D context records calls; resizing resets smoothing like a real canvas. */
function fakeCanvas(hasContext = true): {
  readonly canvas: HTMLCanvasElement;
  readonly context: FakeContext;
} {
  const context: FakeContext = {
    isSmoothing: true,
    options: [],
    images: [],
    puts: [],
    draws: [],
  };
  const size = { width: 300, height: 150 };
  const canvas = {
    style: {} as Record<string, string>,
    get width(): number {
      return size.width;
    },
    set width(value: number) {
      size.width = value;
      context.isSmoothing = true;
    },
    get height(): number {
      return size.height;
    },
    set height(value: number) {
      size.height = value;
      context.isSmoothing = true;
    },
    getContext: (_type: string, options: unknown) => {
      context.options.push(options);
      return hasContext ? fakeContextApi(context) : null;
    },
  };
  return { canvas: canvas as unknown as HTMLCanvasElement, context };
}

/** The drawing methods of a fake context. */
function fakeContextApi(context: FakeContext): object {
  const api = {
    createImageData: (width: number, height: number) => {
      const image = { width, height, data: new Uint8ClampedArray(width * height * 4) };
      context.images.push(image);
      return image;
    },
    putImageData: (image: unknown, x: number, y: number) => context.puts.push([image, x, y]),
    drawImage: (...args: unknown[]) => context.draws.push(args),
  };
  return Object.defineProperty(api, 'imageSmoothingEnabled', {
    set: (isEnabled: boolean) => {
      context.isSmoothing = isEnabled;
    },
  });
}

/** A presenter on fake canvases plus the visible and offscreen fakes. */
function createPresenter(): {
  readonly presenter: CanvasPresenter;
  readonly visible: ReturnType<typeof fakeCanvas>;
  readonly offscreen: ReturnType<typeof fakeCanvas>;
} {
  const visible = fakeCanvas();
  const offscreen = fakeCanvas();
  const document = { createElement: () => offscreen.canvas } as unknown as Document;
  return {
    presenter: new CanvasPresenter({ canvas: visible.canvas, document }),
    visible,
    offscreen,
  };
}

/** A layout with only the fields the presenter reads filled in meaningfully. */
function layoutOf(logical: { width: number; height: number }, scale: number): LayoutResult {
  const device = { width: logical.width * scale, height: logical.height * scale };
  return {
    kind: 'too-small',
    scale,
    cssPerLogical: scale / 2,
    logical,
    canvasDevice: device,
    canvasOffsetDevice: { x: 1, y: 3 },
    canvasCss: { x: 0.5, y: 1.5, width: device.width / 2, height: device.height / 2 },
    safe: { x: 0, y: 0, ...logical },
    menuText: { font: 'r15k-8', zoom: 1 },
    minTouchTarget: 24,
    sizeClass: 'regular',
  };
}

test('both contexts are opaque and the canvas is styled for pixel art', () => {
  const { visible, offscreen } = createPresenter();
  expect(visible.context.options).toEqual([{ alpha: false }]);
  expect(offscreen.context.options).toEqual([{ alpha: false }]);
  expect(visible.canvas.style.position).toBe('absolute');
  expect(visible.canvas.style.imageRendering).toBe('pixelated');
});

test('configure sizes the backing store in device pixels and the CSS box from the layout', () => {
  const { presenter, visible, offscreen } = createPresenter();
  presenter.configure(layoutOf({ width: 4, height: 3 }, 3));
  expect([visible.canvas.width, visible.canvas.height]).toEqual([12, 9]);
  expect([offscreen.canvas.width, offscreen.canvas.height]).toEqual([4, 3]);
  const { width, height, left, top } = visible.canvas.style;
  expect({ width, height, left, top }).toEqual({
    width: '6px',
    height: '4.5px',
    left: '0.5px',
    top: '1.5px',
  });
  expect(visible.context.isSmoothing).toBe(false);
});

test('present converts through the LUT and scales the logical image by the integer scale', () => {
  const { presenter, visible, offscreen } = createPresenter();
  presenter.configure(layoutOf({ width: 2, height: 1 }, 2));
  const framebuffer = createFramebuffer({ width: 2, height: 1 });
  framebuffer.pixels.set([1, 2]);
  const lut = Uint32Array.from({ length: 256 }, (_, slot) => 0xff000000 + slot * 0x010203);
  presenter.present(framebuffer, lut);
  const image = offscreen.context.images[0];
  expect(Array.from(image?.data ?? [])).toEqual([3, 2, 1, 255, 6, 4, 2, 255]);
  expect(offscreen.context.puts).toEqual([[image, 0, 0]]);
  expect(visible.context.draws).toEqual([[offscreen.canvas, 0, 0, 4, 2]]);
});

test('one image is reused until the logical size changes', () => {
  const { presenter, visible, offscreen } = createPresenter();
  const lut = new Uint32Array(256);
  presenter.configure(layoutOf({ width: 2, height: 2 }, 2));
  presenter.present(createFramebuffer({ width: 2, height: 2 }), lut);
  presenter.configure(layoutOf({ width: 2, height: 2 }, 3));
  presenter.present(createFramebuffer({ width: 2, height: 2 }), lut);
  expect(offscreen.context.images).toHaveLength(1);
  expect(visible.context.draws.at(-1)).toEqual([offscreen.canvas, 0, 0, 6, 6]);
  presenter.configure(layoutOf({ width: 3, height: 2 }, 3));
  expect(offscreen.context.images).toHaveLength(2);
  expect(visible.context.isSmoothing).toBe(false);
});

test('an empty logical size presents nothing', () => {
  const { presenter, visible } = createPresenter();
  presenter.configure(layoutOf({ width: 0, height: 5 }, 1));
  presenter.present(createFramebuffer({ width: 0, height: 5 }), new Uint32Array(256));
  expect(visible.context.draws).toEqual([]);
});

test('misuse throws: before configure, wrong framebuffer size, after dispose', () => {
  const { presenter, offscreen } = createPresenter();
  const lut = new Uint32Array(256);
  expect(() => {
    presenter.present(createFramebuffer({ width: 1, height: 1 }), lut);
  }).toThrow('before configure');
  presenter.configure(layoutOf({ width: 2, height: 2 }, 1));
  expect(() => {
    presenter.present(createFramebuffer({ width: 3, height: 2 }), lut);
  }).toThrow(RangeError);
  presenter.dispose();
  expect([offscreen.canvas.width, offscreen.canvas.height]).toEqual([0, 0]);
  expect(() => {
    presenter.present(createFramebuffer({ width: 2, height: 2 }), lut);
  }).toThrow('after dispose');
  expect(() => {
    presenter.configure(layoutOf({ width: 2, height: 2 }, 1));
  }).toThrow('after dispose');
});

test('a canvas without a 2D context is a startup error', () => {
  const visible = fakeCanvas(false);
  const document = { createElement: () => fakeCanvas().canvas } as unknown as Document;
  expect(() => new CanvasPresenter({ canvas: visible.canvas, document })).toThrow(
    'no 2D canvas context',
  );
});
