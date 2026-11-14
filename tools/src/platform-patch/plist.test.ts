import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { repoPath } from '../shared/repo-paths.ts';
import { IOS_INFO_KEYS, MACOS_INFO_KEYS } from './apple-keys.ts';
import { patchInfoPlist, readInfoPlist } from './info-plist.ts';
import { parsePlist, serializePlist } from './plist.ts';
import { expected, fixture } from './test-support/fixtures.ts';

const PLIST = 'ios/Info.plist';

test('the generated Info.plist reads and writes back byte for byte', () => {
  expect(serializePlist(parsePlist(fixture(PLIST)))).toBe(fixture(PLIST));
  expect(serializePlist(parsePlist(expected(PLIST)))).toBe(expected(PLIST));
});

test('the generated Info.plist gets every iOS key; existing equal values stay as they are', () => {
  const result = patchInfoPlist(fixture(PLIST), IOS_INFO_KEYS);
  expect(result.text).toBe(expected(PLIST));
  expect(result.changes).toEqual([
    'LSApplicationCategoryType = "public.app-category.arcade-games" (added)',
    'GCSupportsControllerUserInteraction = true (added)',
    'GCSupportedGameControllers = [{"ProfileName":"ExtendedGamepad"}] (added)',
    'GCSupportsGameMode = true (added)',
    'UIStatusBarHidden = true (added)',
    'UIViewControllerBasedStatusBarAppearance = false (added)',
    'UIRequiresFullScreen = false (added)',
    'UIApplicationSupportsIndirectInputEvents = true (added)',
  ]);
});

test('patching the patched Info.plist changes nothing', () => {
  expect(patchInfoPlist(expected(PLIST), IOS_INFO_KEYS)).toEqual({
    text: expected(PLIST),
    changes: [],
  });
});

test('iPhone orientations never include upside down; iPad orientations include all four', () => {
  const info = readInfoPlist(expected(PLIST));
  expect(info).toMatchObject({
    UISupportedInterfaceOrientations: [
      'UIInterfaceOrientationPortrait',
      'UIInterfaceOrientationLandscapeLeft',
      'UIInterfaceOrientationLandscapeRight',
    ],
  });
  expect(IOS_INFO_KEYS['UISupportedInterfaceOrientations']).not.toContain(
    'UIInterfaceOrientationPortraitUpsideDown',
  );
  expect(IOS_INFO_KEYS['UISupportedInterfaceOrientations~ipad']).toHaveLength(4);
});

test('a differing value is replaced in place', () => {
  const landscapeOnly = patchInfoPlist(expected(PLIST), {
    UISupportedInterfaceOrientations: ['UIInterfaceOrientationLandscapeLeft'],
  });
  expect(landscapeOnly.changes).toEqual([
    'UISupportedInterfaceOrientations = ["UIInterfaceOrientationLandscapeLeft"]',
  ]);
  expect(readInfoPlist(landscapeOnly.text)).toMatchObject({
    UISupportedInterfaceOrientations: ['UIInterfaceOrientationLandscapeLeft'],
  });
});

test('the merge files Tauri reads hold exactly the key tables', () => {
  const ios = readFileSync(repoPath('apps', 'arcade', 'src-tauri', 'Info.ios.plist'), 'utf8');
  const macos = readFileSync(repoPath('apps', 'arcade', 'src-tauri', 'Info.plist'), 'utf8');
  expect(readInfoPlist(ios)).toEqual(IOS_INFO_KEYS);
  expect(readInfoPlist(macos)).toEqual(MACOS_INFO_KEYS);
});

test('entities, empty elements and kept scalars survive a round trip', () => {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<plist version="1.0">',
    '<dict>',
    '\t<key>A &amp; B</key>',
    '\t<string>&lt;x&gt; &#65;&#x42;</string>',
    '\t<key>Count</key>',
    '\t<integer>3</integer>',
    '\t<key>Empty</key>',
    '\t<array/>',
    '</dict>',
    '</plist>',
    '',
  ].join('\n');
  expect(readInfoPlist(xml)).toEqual({ 'A & B': '<x> AB', Count: '3', Empty: [] });
  expect(serializePlist(parsePlist(xml))).toContain('\t<string>&lt;x&gt; AB</string>');
});

test.each([
  ['<dict></dict>', 'does not start with <plist>'],
  ['<plist version="1.0"><array/></plist>', 'the root is not a dict'],
  ['<plist version="1.0"><dict><string>x</string></dict></plist>', 'does not start with <key>'],
  ['<plist version="1.0"><dict><key>x</key><blob/></dict></plist>', 'unknown element <blob/>'],
  ['<plist version="1.0"><dict><key>x</key>', 'unexpected end of document'],
])('an invalid plist %j fails with a clear message', (xml, message) => {
  expect(() => parsePlist(xml)).toThrow(message);
});
