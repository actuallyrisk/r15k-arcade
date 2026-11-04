// Pointer, wheel and context-menu listeners on the stage: one record per active pointer, the steering
// pointer, releases and taps between two polls.
import type { Point } from '../math/geometry.ts';
import type { Clock } from '../time/clock.ts';
import type { InputDevice, PointerKind } from './actions.ts';
import { TAP_MAX_DURATION_MS, TAP_MAX_TRAVEL_CSS } from './bindings.ts';
import type { PointerRelease, PointerSnapshot, Tap } from './input-frame.ts';

/** WheelEvent.deltaMode values (DOM_DELTA_LINE, DOM_DELTA_PAGE); pixels are mode 0. */
const DELTA_LINE = 1;
const DELTA_PAGE = 2;
/** CSS px per wheel line. */
const WHEEL_LINE_CSS = 16;

/** One pressed pointer. */
interface TrackedPointer {
  readonly id: number;
  readonly kind: PointerKind;
  readonly downCss: Point;
  readonly downPosition: Point;
  readonly downAtMs: number;
  position: Point;
  maxTravelCss: number;
}

/** A mouse that moves over the stage without a pressed button. */
interface Hover {
  readonly id: number;
  readonly position: Point;
}

/** Everything the pointers did since the last poll. */
export interface PointerDrain {
  readonly pointer: PointerSnapshot | undefined;
  readonly releases: readonly PointerRelease[];
  readonly taps: readonly Tap[];
  readonly moveTarget: number | undefined;
  readonly wheelDelta: number;
}

/** What the pointer source needs from the input manager. */
export interface PointerSourceOptions {
  readonly surface: HTMLElement;
  readonly clock: Clock;
  readonly toLogical: (cssPoint: Point) => Point | undefined;
  readonly cssPerLogical: () => number;
  /** Called for every pointer or wheel event, with the device for presses and moves. */
  readonly onPointerEvent: (device: InputDevice | undefined) => void;
}

function pointerKind(pointerType: string): PointerKind {
  return pointerType === 'mouse' || pointerType === 'pen' ? pointerType : 'touch';
}

function deviceOf(kind: PointerKind): InputDevice {
  return kind === 'mouse' ? 'mouse' : 'touch';
}

function cssPoint(event: PointerEvent): Point {
  return { x: event.clientX, y: event.clientY };
}

function isTap(release: PointerRelease): boolean {
  return release.durationMs <= TAP_MAX_DURATION_MS && release.maxTravelCss <= TAP_MAX_TRAVEL_CSS;
}

/** Adds a non-passive listener (wheel and context menu are prevented) and returns its remover. */
function listen<K extends keyof HTMLElementEventMap>(
  surface: HTMLElement,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
): () => void {
  surface.addEventListener(type, handler, { passive: false });
  return () => {
    surface.removeEventListener(type, handler);
  };
}

/** Pointer state between two polls. */
export class PointerSource {
  private readonly options: PointerSourceOptions;
  private readonly active = new Map<number, TrackedPointer>();
  private pressed: TrackedPointer[] = [];
  private released = new Set<TrackedPointer>();
  private moved = new Set<TrackedPointer>();
  private releases: PointerRelease[] = [];
  private hover: Hover | undefined;
  private hasHoverMoved = false;
  private wheelDelta = 0;
  private steering: TrackedPointer | undefined;
  private readonly cleanup: () => void;

  constructor(options: PointerSourceOptions) {
    this.options = options;
    const { surface } = options;
    const removers = [
      listen(surface, 'pointerdown', (event) => {
        this.handleDown(event);
      }),
      listen(surface, 'pointermove', (event) => {
        this.handleMove(event);
      }),
      listen(surface, 'pointerup', (event) => {
        this.handleUp(event);
      }),
      listen(surface, 'pointercancel', (event) => {
        this.handleCancel(event);
      }),
      listen(surface, 'lostpointercapture', (event) => {
        this.handleCancel(event);
      }),
      listen(surface, 'pointerleave', (event) => {
        this.handleLeave(event);
      }),
      listen(surface, 'wheel', (event) => {
        this.handleWheel(event);
      }),
      listen(surface, 'contextmenu', (event) => {
        event.preventDefault();
      }),
    ];
    this.cleanup = () => {
      for (const remove of removers) {
        remove();
      }
    };
  }

  /** Returns everything since the last drain and starts a new interval. */
  drain(): PointerDrain {
    const { pointer, moveTarget } = this.steeringSnapshot();
    const drained = {
      pointer,
      releases: this.releases,
      taps: this.releases
        .filter(isTap)
        .map((release) => ({ position: release.position, kind: release.kind })),
      moveTarget,
      wheelDelta: this.wheelDelta,
    };
    this.pressed = [];
    this.released = new Set();
    this.moved = new Set();
    this.releases = [];
    this.hasHoverMoved = false;
    this.wheelDelta = 0;
    return drained;
  }

  /** Removes the listeners. */
  dispose(): void {
    this.cleanup();
  }

  /**
   * The pointer pressed most recently during this poll (even when already released), else the
   * newest active pointer, else the previous steering pointer in the poll of its release, else a
   * hovering mouse.
   */
  private steeringSnapshot(): {
    pointer: PointerSnapshot | undefined;
    moveTarget: number | undefined;
  } {
    const pressed = this.pressed.at(-1);
    const newest = [...this.active.values()].at(-1);
    const target = pressed ?? newest;
    if (target !== undefined) {
      this.steering = target;
      const isDown = this.active.get(target.id) === target;
      const wasPressed = target === pressed;
      const pointer = { ...this.snapshotOf(target, isDown), wasPressed, wasReleased: !isDown };
      const hasMoved = wasPressed || this.moved.has(target);
      return { pointer, moveTarget: hasMoved ? target.position.x : undefined };
    }
    return this.idleSnapshot();
  }

  private idleSnapshot(): { pointer: PointerSnapshot | undefined; moveTarget: number | undefined } {
    const previous = this.steering;
    this.steering = undefined;
    if (previous !== undefined && this.released.has(previous)) {
      const pointer = { ...this.snapshotOf(previous, false), wasPressed: false, wasReleased: true };
      return { pointer, moveTarget: this.moved.has(previous) ? previous.position.x : undefined };
    }
    if (this.hover === undefined) {
      return { pointer: undefined, moveTarget: undefined };
    }
    const { id, position } = this.hover;
    const pointer: PointerSnapshot = {
      id,
      kind: 'mouse',
      position,
      downPosition: undefined,
      isDown: false,
      wasPressed: false,
      wasReleased: false,
    };
    return { pointer, moveTarget: this.hasHoverMoved ? position.x : undefined };
  }

  private snapshotOf(
    pointer: TrackedPointer,
    isDown: boolean,
  ): Omit<PointerSnapshot, 'wasPressed' | 'wasReleased'> {
    const wasPressed = this.pressed.includes(pointer);
    return {
      id: pointer.id,
      kind: pointer.kind,
      position: pointer.position,
      // A press released within the same poll keeps its down position for this frame.
      downPosition: isDown || wasPressed ? pointer.downPosition : undefined,
      isDown,
    };
  }

  private handleDown(event: PointerEvent): void {
    const kind = pointerKind(event.pointerType);
    this.options.onPointerEvent(deviceOf(kind));
    const position = this.options.toLogical(cssPoint(event));
    if (event.button !== 0 || position === undefined) {
      return;
    }
    try {
      this.options.surface.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone (released before the handler ran); its pointerup follows.
    }
    const pointer: TrackedPointer = {
      id: event.pointerId,
      kind,
      downCss: cssPoint(event),
      downPosition: position,
      downAtMs: this.options.clock.now(),
      position,
      maxTravelCss: 0,
    };
    // Re-inserting keeps the map ordered by press time, newest last.
    this.active.delete(event.pointerId);
    this.active.set(event.pointerId, pointer);
    this.pressed.push(pointer);
    if (kind === 'mouse') {
      this.hover = undefined;
    }
  }

  private handleMove(event: PointerEvent): void {
    const pointer = this.active.get(event.pointerId);
    const kind = pointerKind(event.pointerType);
    if (pointer === undefined && kind !== 'mouse') {
      this.options.onPointerEvent(undefined);
      return;
    }
    this.options.onPointerEvent(deviceOf(kind));
    const position = this.options.toLogical(cssPoint(event));
    if (pointer === undefined) {
      if (position !== undefined) {
        this.hover = { id: event.pointerId, position };
        this.hasHoverMoved = true;
      }
      return;
    }
    this.track(pointer, event, position);
    this.moved.add(pointer);
  }

  private track(pointer: TrackedPointer, event: PointerEvent, position: Point | undefined): void {
    if (position !== undefined) {
      pointer.position = position;
    }
    const travel = Math.hypot(event.clientX - pointer.downCss.x, event.clientY - pointer.downCss.y);
    pointer.maxTravelCss = Math.max(pointer.maxTravelCss, travel);
  }

  private handleUp(event: PointerEvent): void {
    this.options.onPointerEvent(undefined);
    const pointer = this.active.get(event.pointerId);
    if (pointer === undefined) {
      return;
    }
    this.track(pointer, event, this.options.toLogical(cssPoint(event)));
    this.active.delete(event.pointerId);
    this.released.add(pointer);
    this.releases.push({
      id: pointer.id,
      kind: pointer.kind,
      downPosition: pointer.downPosition,
      position: pointer.position,
      durationMs: this.options.clock.now() - pointer.downAtMs,
      maxTravelCss: pointer.maxTravelCss,
    });
    if (pointer.kind === 'mouse') {
      this.hover = { id: pointer.id, position: pointer.position };
    }
  }

  /** pointercancel and lostpointercapture end a pointer without a release or tap. */
  private handleCancel(event: PointerEvent): void {
    this.options.onPointerEvent(undefined);
    const pointer = this.active.get(event.pointerId);
    if (pointer === undefined) {
      return;
    }
    this.active.delete(event.pointerId);
    this.pressed = this.pressed.filter((candidate) => candidate !== pointer);
    if (this.steering === pointer) {
      this.steering = undefined;
    }
  }

  private handleLeave(event: PointerEvent): void {
    if (this.hover?.id === event.pointerId && !this.active.has(event.pointerId)) {
      this.hover = undefined;
    }
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();
    this.options.onPointerEvent('mouse');
    this.wheelDelta += (event.deltaY * this.wheelUnitCss(event)) / this.options.cssPerLogical();
  }

  /** CSS px per unit of `deltaY`. */
  private wheelUnitCss(event: WheelEvent): number {
    switch (event.deltaMode) {
      case DELTA_LINE:
        return WHEEL_LINE_CSS;
      case DELTA_PAGE:
        return this.options.surface.getBoundingClientRect().height;
      default:
        return 1;
    }
  }
}
