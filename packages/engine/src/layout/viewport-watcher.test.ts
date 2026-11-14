// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { PostureCapability } from '../platform/platform-types.ts';
import { createEmitter } from '../util/emitter.ts';
import type { PostureInfo } from './layout-types.ts';
import { ViewportWatcher } from './viewport-watcher.ts';
import type { SafeAreaProbes } from './viewport-watcher.ts';

/** A ResizeObserver whose callbacks the test fires. */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  static isDeviceBoxSupported = true;
  readonly callback: ResizeObserverCallback;
  readonly boxes: string[] = [];
  isDisconnected = false;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  observe(_target: Element, options?: ResizeObserverOptions): void {
    const box = options?.box ?? 'content-box';
    if (box === 'device-pixel-content-box' && !FakeResizeObserver.isDeviceBoxSupported) {
      throw new TypeError('unsupported box');
    }
    this.boxes.push(box);
  }

  disconnect(): void {
    this.isDisconnected = true;
  }

  fire(entries: readonly Partial<ResizeObserverEntry>[]): void {
    this.callback(entries as ResizeObserverEntry[], this as unknown as ResizeObserver);
  }
}

/** A media query list that the test can change. */
type FakeQuery = MediaQueryList & EventTarget;

let queries: FakeQuery[];
let probes: SafeAreaProbes;
let stage: HTMLElement;
const postureChanges = createEmitter<PostureInfo>();
let postureInfo: PostureInfo;
const posture: PostureCapability = {
  isAvailable: true,
  current: () => postureInfo,
  subscribe: (listener) => postureChanges.subscribe(listener),
};

function sized(width: number, height: number): HTMLElement {
  const element = document.createElement('div');
  element.getBoundingClientRect = () => new DOMRect(0, 0, width, height);
  return element;
}

function setDpr(dpr: number): void {
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: dpr });
}

beforeEach(() => {
  FakeResizeObserver.instances = [];
  FakeResizeObserver.isDeviceBoxSupported = true;
  Object.defineProperty(window, 'ResizeObserver', {
    configurable: true,
    value: FakeResizeObserver,
  });
  queries = [];
  vi.spyOn(window, 'matchMedia').mockImplementation((media) => {
    const query = Object.assign(new EventTarget(), { matches: false, media }) as FakeQuery;
    queries.push(query);
    return query;
  });
  setDpr(2);
  stage = sized(400, 300);
  probes = { top: sized(0, 20), right: sized(0, 0), bottom: sized(0, 10), left: sized(0, 0) };
  postureInfo = { posture: 'flat', segments: [] };
});

afterEach(() => {
  postureChanges.clear();
  Reflect.deleteProperty(window, 'devicePixelRatio');
});

const createWatcher = (): ViewportWatcher =>
  new ViewportWatcher({ window, stage, safeAreaProbes: probes, posture });

test('ViewportWatcher: the first snapshot reads the stage, the DPR, the probes and the posture', () => {
  expect(createWatcher().current()).toEqual({
    cssWidth: 400,
    cssHeight: 300,
    devicePixelRatio: 2,
    deviceWidth: 800,
    deviceHeight: 600,
    safeArea: { top: 20, right: 0, bottom: 10, left: 0 },
    posture: postureInfo,
  });
});

test('ViewportWatcher: device pixels come from the device-pixel content box and changes notify once', () => {
  const watcher = createWatcher();
  const listener = vi.fn();
  watcher.subscribe(listener);
  const [stageObserver] = FakeResizeObserver.instances;
  expect(stageObserver?.boxes).toEqual(['device-pixel-content-box']);
  const entry = { devicePixelContentBoxSize: [{ inlineSize: 801, blockSize: 599 }] };
  stageObserver?.fire([entry]);
  stageObserver?.fire([entry]);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(watcher.current()).toMatchObject({ deviceWidth: 801, deviceHeight: 599 });
});

test('ViewportWatcher: WebKit throws for the device-pixel box: content box and round(css × dpr)', () => {
  FakeResizeObserver.isDeviceBoxSupported = false;
  const watcher = createWatcher();
  const [stageObserver] = FakeResizeObserver.instances;
  expect(stageObserver?.boxes).toEqual(['content-box']);
  stage.getBoundingClientRect = () => new DOMRect(0, 0, 390.5, 300);
  stageObserver?.fire([{ devicePixelContentBoxSize: [{ inlineSize: 1, blockSize: 1 }] }]);
  expect(watcher.current()).toMatchObject({
    cssWidth: 390.5,
    deviceWidth: 781,
    deviceHeight: 600,
  });
});

test('ViewportWatcher: one probe changing alone fires (a 180° rotation swaps left and right)', () => {
  const watcher = createWatcher();
  const listener = vi.fn();
  watcher.subscribe(listener);
  const probeObserver = FakeResizeObserver.instances[1];
  expect(probeObserver?.boxes).toEqual(['border-box', 'border-box', 'border-box', 'border-box']);
  probes.left.getBoundingClientRect = () => new DOMRect(0, 0, 47, 0);
  probeObserver?.fire([{}]);
  expect(listener).toHaveBeenCalledWith(
    expect.objectContaining({ safeArea: { top: 20, right: 0, bottom: 10, left: 47 } }),
  );
});

test('ViewportWatcher: posture changes and DPR changes produce new snapshots', () => {
  const watcher = createWatcher();
  const listener = vi.fn();
  watcher.subscribe(listener);
  postureInfo = { posture: 'book', segments: [] };
  postureChanges.emit(postureInfo);
  expect(watcher.current().posture.posture).toBe('book');
  const [resolution] = queries;
  expect(resolution?.media).toBe('(resolution: 2dppx)');
  setDpr(3);
  resolution?.dispatchEvent(new Event('change'));
  expect(queries[1]?.media).toBe('(resolution: 3dppx)');
  expect(watcher.current()).toMatchObject({ devicePixelRatio: 3, deviceWidth: 1200 });
  resolution?.dispatchEvent(new Event('change'));
  expect(queries).toHaveLength(2);
  expect(listener).toHaveBeenCalledTimes(2);
});

test('ViewportWatcher: without screen.orientation the window orientation and resize events are used', () => {
  const watcher = createWatcher();
  const listener = vi.fn();
  watcher.subscribe(listener);
  stage.getBoundingClientRect = () => new DOMRect(0, 0, 300, 400);
  window.dispatchEvent(new Event('orientationchange'));
  expect(listener).toHaveBeenCalledTimes(1);
  stage.getBoundingClientRect = () => new DOMRect(0, 0, 310, 400);
  window.dispatchEvent(new Event('resize'));
  expect(listener).toHaveBeenCalledTimes(2);
});

test('ViewportWatcher: screen.orientation change is observed where it exists', () => {
  const orientation = new EventTarget();
  Object.defineProperty(window.screen, 'orientation', { configurable: true, value: orientation });
  const watcher = createWatcher();
  stage.getBoundingClientRect = () => new DOMRect(0, 0, 300, 400);
  orientation.dispatchEvent(new Event('change'));
  expect(watcher.current().cssWidth).toBe(300);
  watcher.dispose();
  Reflect.deleteProperty(window.screen, 'orientation');
});

test('ViewportWatcher: dispose disconnects every observer and stops notifying', () => {
  const watcher = createWatcher();
  const listener = vi.fn();
  watcher.subscribe(listener);
  watcher.dispose();
  expect(FakeResizeObserver.instances.every((observer) => observer.isDisconnected)).toBe(true);
  stage.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100);
  window.dispatchEvent(new Event('resize'));
  queries[0]?.dispatchEvent(new Event('change'));
  postureChanges.emit({ posture: 'tabletop', segments: [] });
  expect(listener).not.toHaveBeenCalled();
});

test('ViewportWatcher: works without ResizeObserver through the window events', () => {
  Reflect.deleteProperty(window, 'ResizeObserver');
  Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: undefined });
  const watcher = createWatcher();
  stage.getBoundingClientRect = () => new DOMRect(0, 0, 500, 300);
  window.dispatchEvent(new Event('resize'));
  expect(watcher.current().cssWidth).toBe(500);
  watcher.dispose();
});
