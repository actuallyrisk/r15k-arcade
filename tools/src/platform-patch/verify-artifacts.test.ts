import { expect, test } from 'vitest';
import { IOS_INFO_KEYS, MACOS_BUNDLE_KEYS } from './apple-keys.ts';
import {
  androidManifestProblems,
  booleanValue,
  devicePluginProblems,
  infoPlistProblems,
  integerValue,
  parseXmlTree,
} from './verify-artifacts.ts';

const NS = 'http://schemas.android.com/apk/res/android';

/** An `aapt2 dump xmltree` attribute line. */
const attribute = (indent: number, name: string, value: string): string =>
  `${' '.repeat(indent)}A: ${NS}:${name}(0x01010000)=${value}`;

/** A string attribute line with aapt2's raw suffix. */
const text = (indent: number, name: string, value: string): string =>
  attribute(indent, name, `"${value}" (Raw: "${value}")`);

/** The dump of a manifest with every game flag; `replace` swaps single lines to break one flag. */
function manifestDump(replace: Readonly<Record<string, string>> = {}): string {
  const lines = [
    `N: android=${NS} (line=2)`,
    '  E: manifest (line=2)',
    attribute(4, 'versionCode', '1'),
    '    E: uses-feature (line=6)',
    text(6, 'name', 'android.software.leanback'),
    attribute(6, 'required', 'false'),
    '    E: uses-feature (line=7)',
    text(6, 'name', 'android.hardware.gamepad'),
    attribute(6, 'required', 'false'),
    '    E: uses-feature (line=8)',
    text(6, 'name', 'android.hardware.touchscreen'),
    attribute(6, 'required', '(type 0x12)0x0'),
    '    E: application (line=10)',
    attribute(6, 'appCategory', '0'),
    attribute(6, 'isGame', 'true'),
    '      E: activity (line=17)',
    text(8, 'name', 'dev.r15k.arcade.MainActivity'),
    attribute(8, 'screenOrientation', '13'),
    attribute(8, 'configChanges', '0x00001ff4'),
    attribute(8, 'resizeableActivity', 'true'),
  ];
  return lines.map((line) => replace[line] ?? line).join('\n');
}

test('the xmltree parser nests elements by indentation and names attributes android:*', () => {
  const [manifest] = parseXmlTree(manifestDump());
  expect(manifest?.name).toBe('manifest');
  expect(manifest?.children.map((child) => child.name)).toEqual([
    'uses-feature',
    'uses-feature',
    'uses-feature',
    'application',
  ]);
  const activity = manifest?.children[3]?.children[0];
  expect(activity?.attributes['android:name']).toBe('dev.r15k.arcade.MainActivity');
  expect(activity?.attributes['android:configChanges']).toBe('0x00001ff4');
});

test('integer and boolean values are read in every form aapt prints', () => {
  expect(integerValue('13')).toBe(13);
  expect(integerValue('0x0000000d')).toBe(13);
  expect(integerValue('(type 0x10)0xd')).toBe(13);
  expect(integerValue('"13"')).toBeUndefined();
  expect(booleanValue('true')).toBe(true);
  expect(booleanValue('(type 0x12)0xffffffff')).toBe(true);
  expect(booleanValue('0')).toBe(false);
  expect(booleanValue(undefined)).toBeUndefined();
});

test('a manifest with every game flag has no problems', () => {
  expect(androidManifestProblems(manifestDump())).toEqual([]);
});

test.each([
  [attribute(6, 'appCategory', '0'), attribute(6, 'appCategory', '1'), 'appCategory'],
  [attribute(6, 'isGame', 'true'), attribute(6, 'isGame', 'false'), 'isGame'],
  [attribute(8, 'resizeableActivity', 'true'), '', 'resizeableActivity'],
  [
    attribute(8, 'screenOrientation', '13'),
    attribute(8, 'screenOrientation', '1'),
    'screenOrientation',
  ],
  [
    attribute(8, 'configChanges', '0x00001ff4'),
    attribute(8, 'configChanges', '0x00000ff4'),
    'configChanges',
  ],
  [attribute(6, 'required', '(type 0x12)0x0'), attribute(6, 'required', 'true'), 'touchscreen'],
])('a manifest with %j changed reports it', (line, replacement, problem) => {
  const problems = androidManifestProblems(manifestDump({ [line]: replacement }));
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain(problem);
});

test('missing elements are reported', () => {
  expect(androidManifestProblems('')).toEqual(['no <manifest> element in the aapt2 output']);
  const withoutActivity = manifestDump({
    '      E: activity (line=17)': '      E: service (line=17)',
  });
  expect(androidManifestProblems(withoutActivity)).toEqual(['no .MainActivity <activity> element']);
});

const PLUGIN = 'dev.r15k.arcade.device.DevicePlugin';

test('the kept device plugin is found in the apkanalyzer listing (tabs or spaces)', () => {
  const listing = [
    'P\td\t3\t3\t512\tdev.r15k.arcade.device',
    `C\td\t3\t3\t400\t${PLUGIN}`,
    `M\td\t1\t1\t50\t${PLUGIN} void setImmersive(app.tauri.plugin.Invoke)`,
    `M d 1 1 50 ${PLUGIN} void setKeepAwake(app.tauri.plugin.Invoke)`,
    `M\td\t1\t1\t50\t${PLUGIN} void moveToBackground(app.tauri.plugin.Invoke)`,
  ].join('\n');
  expect(devicePluginProblems(listing)).toEqual([]);
});

test('a renamed method and a removed class are reported', () => {
  const renamed = [`C d 3 3 400 ${PLUGIN}`, `M d 1 1 50 ${PLUGIN} void a(app.tauri.plugin.Invoke)`];
  expect(devicePluginProblems(renamed.join('\n'))).toHaveLength(3);
  expect(devicePluginProblems('')).toHaveLength(4);
});

test('the bundle Info.plist must hold every key with the exact value', () => {
  expect(
    infoPlistProblems({ ...IOS_INFO_KEYS, CFBundleName: 'R15K Arcade' }, IOS_INFO_KEYS),
  ).toEqual([]);
  expect(infoPlistProblems({ GCSupportsGameMode: true }, MACOS_BUNDLE_KEYS)).toEqual([
    'Info.plist GCSupportsControllerUserInteraction is missing, expected true',
    'Info.plist LSApplicationCategoryType is missing, expected "public.app-category.arcade-games"',
  ]);
  expect(infoPlistProblems([], MACOS_BUNDLE_KEYS)).toHaveLength(3);
  expect(infoPlistProblems('x', MACOS_BUNDLE_KEYS)).toEqual(['Info.plist is not a dictionary']);
});
