import { expect, test, vi } from 'vitest';
import { DEVICE_COMMANDS } from './device-plugin.ts';
import { createFakePlatform } from './fake-platform.ts';
import { UNAVAILABLE_TOGGLE } from './platform-types.ts';
import type { CapabilityName } from './platform-types.ts';

const ALL_CAPABILITIES: readonly CapabilityName[] = [
  'haptics',
  'keepAwake',
  'immersive',
  'fullscreen',
  'posture',
  'openUrl',
  'backButton',
  'windowReveal',
  'share',
  'gamesServices',
  'tips',
];

test('createFakePlatform: defaults: unknown OS, memory storage, nothing available, flat posture', async () => {
  const platform = createFakePlatform();
  expect(platform).toMatchObject({ kind: 'fake', os: 'unknown', isStoreBuild: false });
  expect(platform.storage.kind).toBe('memory');
  for (const name of ALL_CAPABILITIES) {
    expect(platform[name].isAvailable).toBe(false);
  }
  expect(platform.fullscreen.shortcut).toBe('none');
  expect(platform.posture.current()).toEqual({ posture: 'flat', segments: [] });
  await platform.keepAwake.set(true);
  expect(platform.calls).toEqual([{ capability: 'keepAwake.set', argument: true }]);
});

test('createFakePlatform: listed capabilities are available; fullscreen then uses F11', () => {
  const platform = createFakePlatform({ os: 'windows', availableCapabilities: ALL_CAPABILITIES });
  expect(platform.os).toBe('windows');
  for (const name of ALL_CAPABILITIES) {
    expect(platform[name].isAvailable).toBe(true);
  }
  expect(platform.fullscreen.shortcut).toBe('f11');
});

test('createFakePlatform: every method call is recorded in order with its argument', async () => {
  const platform = createFakePlatform();
  await platform.haptics.play('tick');
  await platform.immersive.set(false);
  await platform.fullscreen.toggle();
  await platform.openUrl.open('https://r15k.dev');
  await platform.backButton.moveToBackground();
  await platform.windowReveal.show();
  await platform.share.sharePng(new Uint8Array(1), 'score 10');
  await platform.gamesServices.submitScore('arcade', 10);
  expect(platform.calls).toEqual([
    { capability: 'haptics.play', argument: 'tick' },
    { capability: 'immersive.set', argument: false },
    { capability: 'fullscreen.toggle', argument: undefined },
    { capability: 'openUrl.open', argument: 'https://r15k.dev' },
    { capability: 'backButton.moveToBackground', argument: undefined },
    { capability: 'windowReveal.show', argument: undefined },
    { capability: 'share.sharePng', argument: 'score 10' },
    { capability: 'gamesServices.submitScore', argument: { board: 'arcade', score: 10 } },
  ]);
});

test('createFakePlatform: setPosture and pressBack notify their subscribers', () => {
  const platform = createFakePlatform({
    os: 'android',
    availableCapabilities: ['backButton', 'immersive', 'keepAwake'],
  });
  const back = vi.fn();
  const postures = vi.fn();
  const stopBack = platform.backButton.subscribe(back);
  platform.posture.subscribe(postures);
  platform.pressBack();
  stopBack();
  platform.pressBack();
  const tabletop = { posture: 'tabletop', segments: [] } as const;
  platform.setPosture(tabletop);
  expect(back).toHaveBeenCalledTimes(1);
  expect(postures).toHaveBeenCalledWith(tabletop);
  expect(platform.posture.current()).toBe(tabletop);
});

test('constants: the unavailable toggle resolves without doing anything', async () => {
  expect(UNAVAILABLE_TOGGLE.isAvailable).toBe(false);
  await expect(UNAVAILABLE_TOGGLE.set(true)).resolves.toBeUndefined();
});

test('constants: device plugin command names', () => {
  expect(DEVICE_COMMANDS).toEqual({
    setImmersive: 'plugin:device|set_immersive',
    setKeepAwake: 'plugin:device|set_keep_awake',
    moveToBackground: 'plugin:device|move_to_background',
  });
});
