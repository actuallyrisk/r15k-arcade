// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createLogger } from '../logger/logger.ts';
import { createMemorySink } from '../logger/memory-sink.ts';
import type { MemorySink } from '../logger/memory-sink.ts';
import { createWebPosture } from './posture-web.ts';
import { createWebPlatform } from './web-platform.ts';

let sink: MemorySink;

const context = (): { window: Window; logger: ReturnType<typeof createLogger> } => ({
  window,
  logger: createLogger({ isEnabled: true, sink: sink.sink }),
});

/** A wake lock stub whose sentinels the test can release. */
function stubWakeLock(request: () => Promise<WakeLockSentinel>): void {
  Object.defineProperty(window.navigator, 'wakeLock', { configurable: true, value: { request } });
}

/** A wake lock sentinel and the spy of its release method. */
function fakeSentinel(): {
  readonly sentinel: WakeLockSentinel;
  readonly release: () => Promise<void>;
} {
  const lock = {
    released: false,
    release: vi.fn(() => {
      lock.released = true;
      return Promise.resolve();
    }),
  };
  return { sentinel: lock as unknown as WakeLockSentinel, release: lock.release };
}

beforeEach(() => {
  sink = createMemorySink();
});

afterEach(() => {
  Reflect.deleteProperty(window.navigator, 'wakeLock');
  Reflect.deleteProperty(window, 'viewport');
  Reflect.deleteProperty(document, 'visibilityState');
});

test('createWebPlatform: localStorage storage, window.open for the allowed URL, the rest unavailable', async () => {
  const platform = createWebPlatform(context());
  expect(platform).toMatchObject({ kind: 'web', os: 'unknown', isStoreBuild: false });
  expect(platform.storage.kind).toBe('local-storage');
  await platform.storage.write('probe', '1');
  expect(localStorage.getItem('r15k-arcade:probe')).toBe('1');
  const open = vi.spyOn(window, 'open').mockReturnValue(null);
  await platform.openUrl.open('https://r15k.dev');
  expect(open).toHaveBeenCalledWith('https://r15k.dev', '_blank', 'noopener');
});

test('createWebPlatform: every other capability is unavailable and resolves', async () => {
  const platform = createWebPlatform(context());
  for (const name of [
    'haptics',
    'immersive',
    'fullscreen',
    'backButton',
    'windowReveal',
  ] as const) {
    expect(platform[name].isAvailable).toBe(false);
  }
  expect([
    platform.share.isAvailable,
    platform.gamesServices.isAvailable,
    platform.tips.isAvailable,
  ]).toEqual([false, false, false]);
  expect(platform.keepAwake.isAvailable).toBe(false);
  await platform.haptics.play('tick');
  await platform.fullscreen.toggle();
  await platform.windowReveal.show();
  await platform.share.sharePng(new Uint8Array(0), '');
  await platform.gamesServices.submitScore('arcade', 1);
  await platform.backButton.moveToBackground();
  platform.backButton.subscribe(() => undefined)();
});

test('createWebPlatform: blocked localStorage falls back to memory with a warning', () => {
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new Error('SecurityError');
  });
  expect(createWebPlatform(context()).storage.kind).toBe('memory');
  expect(sink.entries[0]?.level).toBe('warn');
});

test('keep-awake through the wake lock: requests on, releases off and re-requests when visible again', async () => {
  const locks = [fakeSentinel(), fakeSentinel()];
  const request = vi.fn(() =>
    Promise.resolve((locks[request.mock.calls.length - 1] ?? fakeSentinel()).sentinel),
  );
  stubWakeLock(request);
  const keepAwake = createWebPlatform(context()).keepAwake;
  expect(keepAwake.isAvailable).toBe(true);
  await keepAwake.set(true);
  await keepAwake.set(true);
  expect(request).toHaveBeenCalledTimes(1);
  await locks[0]?.release();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  document.dispatchEvent(new Event('visibilitychange'));
  await vi.waitFor(() => {
    expect(request).toHaveBeenCalledTimes(2);
  });
  await keepAwake.set(false);
  expect(vi.mocked(locks[1]?.release)).toHaveBeenCalled();
  document.dispatchEvent(new Event('visibilitychange'));
  expect(request).toHaveBeenCalledTimes(2);
});

test('keep-awake through the wake lock: refusals and release failures are logged, never thrown', async () => {
  const failing = {
    released: false,
    release: () => Promise.reject(new Error('gone')),
  } as unknown as WakeLockSentinel;
  const request = vi
    .fn<() => Promise<WakeLockSentinel>>()
    .mockRejectedValueOnce(new Error('NotAllowedError'))
    .mockResolvedValueOnce(failing);
  stubWakeLock(request);
  const keepAwake = createWebPlatform(context()).keepAwake;
  await keepAwake.set(true);
  await keepAwake.set(true);
  await keepAwake.set(false);
  expect(sink.entries.map((entry) => entry.message)).toEqual([
    'screen wake lock was refused',
    'screen wake lock could not be released',
  ]);
});

test('createWebPosture: without the Viewport Segments API: flat and unavailable', () => {
  const posture = createWebPosture(window);
  expect(posture.isAvailable).toBe(false);
  expect(posture.current()).toEqual({ posture: 'flat', segments: [] });
});

test('createWebPosture: two stacked segments are tabletop; media query changes notify', () => {
  const segments = [new DOMRect(0, 0, 673, 420), new DOMRect(0, 421, 673, 420)];
  Object.defineProperty(window, 'viewport', { configurable: true, value: { segments } });
  const queries: EventTarget[] = [];
  vi.spyOn(window, 'matchMedia').mockImplementation((media) => {
    const query = Object.assign(new EventTarget(), { matches: false, media });
    queries.push(query);
    return query as unknown as MediaQueryList;
  });
  const posture = createWebPosture(window);
  expect(posture.isAvailable).toBe(true);
  expect(posture.current()).toEqual({
    posture: 'tabletop',
    segments: [
      { x: 0, y: 0, width: 673, height: 420 },
      { x: 0, y: 421, width: 673, height: 420 },
    ],
  });
  const listener = vi.fn();
  const unsubscribe = posture.subscribe(listener);
  expect(queries).toHaveLength(2);
  queries[1]?.dispatchEvent(new Event('change'));
  unsubscribe();
  queries[0]?.dispatchEvent(new Event('change'));
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener).toHaveBeenCalledWith(expect.objectContaining({ posture: 'tabletop' }));
});
