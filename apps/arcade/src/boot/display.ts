import {
  CanvasPresenter,
  computeLayout,
  createDrawTarget,
  createFramebuffer,
  cssToLogical,
  logicalToCss,
} from '@r15k/engine';
import type {
  DrawTarget,
  LayoutResult,
  PlayfieldSpec,
  Point,
  Rect,
  ViewportSnapshot,
} from '@r15k/engine';

/** What a layout change means for a running round. */
export interface LayoutChange {
  /** Scale, logical size or arrangement changed (auto-pause 'viewport-changed'). */
  readonly isViewportChange: boolean;
  /** The posture changed (auto-pause 'posture-changed'). */
  readonly isPostureChange: boolean;
}

/** The canvas, its framebuffer and the current layout. */
export interface Display {
  readonly layout: LayoutResult;
  readonly target: DrawTarget;
  /** Presents the framebuffer through a palette LUT. */
  present(lut: Uint32Array): void;
  toCss(rect: Rect): Rect;
  toLogical(cssPoint: Point): Point | undefined;
  /** Applies a new viewport: layout, presenter and (for a new logical size) a new framebuffer. */
  apply(snapshot: ViewportSnapshot): LayoutChange;
}

/** The arrangement and posture of a layout ('too-small' for both when it is too small). */
function shapeOf(layout: LayoutResult): { readonly arrangement: string; readonly posture: string } {
  return layout.kind === 'ok'
    ? { arrangement: layout.arrangement, posture: layout.posture }
    : { arrangement: 'too-small', posture: 'too-small' };
}

/** The display: presenter, framebuffer and layout for the current viewport. */
class CanvasDisplay implements Display {
  private readonly presenter: CanvasPresenter;
  private readonly playfield: PlayfieldSpec;
  private currentLayout: LayoutResult;
  private currentTarget: DrawTarget;

  constructor(options: DisplayOptions) {
    this.presenter = new CanvasPresenter({ canvas: options.canvas, document: options.document });
    this.playfield = options.playfield;
    this.currentLayout = computeLayout(options.snapshot, options.playfield);
    this.currentTarget = createDrawTarget(createFramebuffer(this.currentLayout.logical));
    this.presenter.configure(this.currentLayout);
  }

  get layout(): LayoutResult {
    return this.currentLayout;
  }

  get target(): DrawTarget {
    return this.currentTarget;
  }

  present(lut: Uint32Array): void {
    this.presenter.present(this.currentTarget.framebuffer, lut);
  }

  toCss(rect: Rect): Rect {
    return logicalToCss(this.currentLayout, rect);
  }

  toLogical(cssPoint: Point): Point | undefined {
    return cssToLogical(this.currentLayout, cssPoint);
  }

  apply(snapshot: ViewportSnapshot): LayoutChange {
    const previous = this.currentLayout;
    const layout = computeLayout(snapshot, this.playfield);
    this.currentLayout = layout;
    const isResized =
      layout.logical.width !== previous.logical.width ||
      layout.logical.height !== previous.logical.height;
    if (isResized) {
      this.currentTarget = createDrawTarget(createFramebuffer(layout.logical));
    }
    this.presenter.configure(layout);
    const before = shapeOf(previous);
    const after = shapeOf(layout);
    return {
      isViewportChange:
        isResized || layout.scale !== previous.scale || before.arrangement !== after.arrangement,
      isPostureChange: before.posture !== after.posture,
    };
  }
}

/** What the display is created from. */
export interface DisplayOptions {
  readonly canvas: HTMLCanvasElement;
  readonly document: Document;
  readonly snapshot: ViewportSnapshot;
  readonly playfield: PlayfieldSpec;
}

/** Creates the display for the first viewport snapshot. */
export function createDisplay(options: DisplayOptions): Display {
  return new CanvasDisplay(options);
}
