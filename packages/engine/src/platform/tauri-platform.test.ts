// @vitest-environment happy-dom
import { beforeEach, expect, test, vi } from 'vitest';
import { createLogger } from '../logger/logger.ts';
import { createMemorySink } from '../logger/memory-sink.ts';
import type { MemorySink } from '../logger/memory-sink.ts';
import type { OperatingSystem } from './platform-types.ts';
import { selectPlatform } from './select-platform.ts';
import { createTauriPlatform } from './tauri-platform.ts';

/** State of the mocked Tauri modules. */
const tauri = vi.hoisted(() => ({
  isInsideTauri: true,
  os: 'android',
  invoke: vi.fn((_command: string, _args?: unknown): Promise<unknown> => Promise.resolve()),
  openUrl: vi.fn((_url: string): Promise<void> => Promise.resolve()),
  isFullscreen: false,
  setFullscreen: vi.fn((_isOn: boolean): Promise<void> => Promise.resolve()),
  show: vi.fn((): Promise<void> => Promise.resolve()),
  backHandlers: [] as (() => void)[],
  unregister: vi.fn((): Promise<void> => Promise.resolve()),
  isBackRegistrationFailing: false,
}));

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => tauri.isInsideTauri,
  invoke: tauri.invoke,
}));
vi.mock('@tauri-apps/plugin-os', () => ({ platform: () => tauri.os }));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: tauri.openUrl }));
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    isFullscreen: () => Promise.resolve(tauri.isFullscreen),
    setFullscreen: tauri.setFullscreen,
    show: tauri.show,
  }),
}));
vi.mock('@tauri-apps/api/app', () => ({
  onBackButtonPress: (handler: () => void) => {
    if (tauri.isBackRegistrationFailing) {
      return Promise.reject(new Error('no permission'));
    }
    tauri.backHandlers.push(handler);
    return Promise.resolve({ unregister: tauri.unregister });
  },
}));
vi.mock('@tauri-apps/plugin-store', () => ({
  load: () =>
    Promise.resolve({
      get: () => Promise.resolve(undefined),
      set: () => Promise.resolve(),
      delete: () => Promise.resolve(true),
      save: () => Promise.resolve(),
    }),
}));

let sink: MemorySink;

function platformOn(os: OperatingSystem | 'freebsd'): ReturnType<typeof createTauriPlatform> {
  tauri.os = os;
  return createTauriPlatform({
    window,
    logger: createLogger({ isEnabled: true, sink: sink.sink }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  sink = createMemorySink();
  tauri.isInsideTauri = true;
  tauri.isBackRegistrationFailing = false;
  tauri.backHandlers.length = 0;
});

test('createTauriPlatform on Android: device plugin toggles invoke the plugin commands with { enabled }', async () => {
  const platform = await platformOn('android');
  expect(platform).toMatchObject({ kind: 'tauri', os: 'android', isStoreBuild: false });
  expect(platform.storage.kind).toBe('tauri-store');
  await platform.keepAwake.set(true);
  await platform.immersive.set(false);
  await platform.backButton.moveToBackground();
  expect(tauri.invoke.mock.calls).toEqual([
    ['plugin:device|set_keep_awake', { enabled: true }],
    ['plugin:device|set_immersive', { enabled: false }],
    ['plugin:device|move_to_background'],
  ]);
  expect(platform.fullscreen.isAvailable).toBe(false);
  expect(platform.windowReveal.isAvailable).toBe(false);
});

test('createTauriPlatform on Android: a rejected invoke is logged once and the toggle turns unavailable', async () => {
  const platform = await platformOn('android');
  tauri.invoke.mockRejectedValueOnce(new Error('plugin missing'));
  await platform.immersive.set(true);
  await platform.immersive.set(true);
  expect(platform.immersive.isAvailable).toBe(false);
  expect(tauri.invoke).toHaveBeenCalledTimes(1);
  expect(sink.entries.filter((entry) => entry.level === 'warn')).toHaveLength(1);
});

test('createTauriPlatform on Android: the back button registers onBackButtonPress and unregisters again', async () => {
  const platform = await platformOn('android');
  const listener = vi.fn();
  const unsubscribe = platform.backButton.subscribe(listener);
  await vi.waitFor(() => {
    expect(tauri.backHandlers).toHaveLength(1);
  });
  tauri.backHandlers[0]?.();
  expect(listener).toHaveBeenCalledTimes(1);
  unsubscribe();
  await vi.waitFor(() => {
    expect(tauri.unregister).toHaveBeenCalledTimes(1);
  });
});

test('createTauriPlatform on Android: a failing back-button registration is logged', async () => {
  tauri.isBackRegistrationFailing = true;
  const platform = await platformOn('android');
  platform.backButton.subscribe(() => undefined)();
  await vi.waitFor(() => {
    expect(sink.entries.map((entry) => entry.message)).toContain(
      'the back button listener could not be registered',
    );
  });
});

test('createTauriPlatform elsewhere: iOS: keep-awake only; no immersive, back button or fullscreen', async () => {
  const platform = await platformOn('ios');
  await platform.keepAwake.set(true);
  await platform.immersive.set(true);
  expect(tauri.invoke).toHaveBeenLastCalledWith('plugin:device|set_keep_awake', {
    enabled: true,
  });
  expect([platform.immersive.isAvailable, platform.backButton.isAvailable]).toEqual([false, false]);
  expect(platform.fullscreen.shortcut).toBe('none');
});

test('createTauriPlatform elsewhere: Windows: F11 fullscreen toggles the window, reveal shows it, no device plugin', async () => {
  const platform = await platformOn('windows');
  expect(platform.fullscreen).toMatchObject({ isAvailable: true, shortcut: 'f11' });
  tauri.isFullscreen = true;
  await platform.fullscreen.toggle();
  expect(tauri.setFullscreen).toHaveBeenLastCalledWith(false);
  await platform.windowReveal.show();
  expect(tauri.show).toHaveBeenCalled();
  expect(platform.keepAwake.isAvailable).toBe(false);
  await platform.openUrl.open('https://r15k.dev');
  expect(tauri.openUrl).toHaveBeenCalledWith('https://r15k.dev');
});

test('createTauriPlatform elsewhere: macOS uses the native menu; other systems have no shortcut', async () => {
  expect((await platformOn('macos')).fullscreen.shortcut).toBe('native-menu');
  expect((await platformOn('linux')).fullscreen.shortcut).toBe('f11');
  const other = await platformOn('freebsd');
  expect(other.os).toBe('unknown');
  expect(other.fullscreen).toMatchObject({ isAvailable: true, shortcut: 'none' });
});

test('createTauriPlatform elsewhere: failing window calls are logged, never thrown', async () => {
  const platform = await platformOn('windows');
  tauri.show.mockRejectedValueOnce(new Error('no window'));
  tauri.openUrl.mockRejectedValueOnce(new Error('denied'));
  await platform.windowReveal.show();
  await platform.openUrl.open('https://r15k.dev');
  expect(sink.entries.map((entry) => entry.message)).toEqual([
    'the window could not be shown',
    'the link could not be opened',
  ]);
});

test('selectPlatform: Tauri inside the shell, web otherwise', async () => {
  const logger = createLogger({ isEnabled: false, sink: sink.sink });
  tauri.os = 'windows';
  expect((await selectPlatform({ window, logger })).kind).toBe('tauri');
  tauri.isInsideTauri = false;
  expect((await selectPlatform({ window, logger })).kind).toBe('web');
});
