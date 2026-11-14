import { expect, test } from 'vitest';
import { mergeConfigChanges, patchAndroidManifest } from './android-manifest.ts';
import { expected, fixture, fixtureWith } from './test-support/fixtures.ts';

const MANIFEST = 'android/AndroidManifest.xml';

test('the generated manifest patches to the expected result and reports every change', () => {
  const result = patchAndroidManifest(fixture(MANIFEST));
  expect(result.text).toBe(expected(MANIFEST));
  expect(result.changes).toEqual([
    'application@android:appCategory = "game"',
    'application@android:isGame = "true"',
    'activity(.MainActivity)@android:resizeableActivity = "true"',
    'activity(.MainActivity)@android:screenOrientation = "fullUser"',
    'activity(.MainActivity)@android:configChanges = "orientation|screenSize|smallestScreenSize|screenLayout|density|keyboard|keyboardHidden|navigation|uiMode|locale"',
    '<uses-feature android:name="android.hardware.gamepad" android:required="false" /> inserted',
    '<uses-feature android:name="android.hardware.touchscreen" android:required="false" /> inserted',
  ]);
});

test('patching the patched manifest changes nothing', () => {
  const result = patchAndroidManifest(expected(MANIFEST));
  expect(result.text).toBe(expected(MANIFEST));
  expect(result.changes).toEqual([]);
});

test('configChanges lists the handled changes first and keeps other generated tokens after them', () => {
  expect(mergeConfigChanges('orientation|keyboardHidden|locale|uiMode')).toBe(
    'orientation|screenSize|smallestScreenSize|screenLayout|density|keyboard|keyboardHidden|navigation|uiMode|locale',
  );
  expect(mergeConfigChanges(undefined)).toBe(
    'orientation|screenSize|smallestScreenSize|screenLayout|density|keyboard|keyboardHidden|navigation|uiMode',
  );
});

test('an existing feature declaration is made optional instead of duplicated', () => {
  const declared = fixtureWith(
    MANIFEST,
    '    <application\n',
    '    <uses-feature android:name="android.hardware.gamepad" android:required="true" />\n\n    <application\n',
  );
  const result = patchAndroidManifest(declared);
  expect(result.text.match(/android\.hardware\.gamepad/g)).toHaveLength(1);
  expect(result.text).toContain(
    '<uses-feature android:name="android.hardware.gamepad" android:required="false" />',
  );
  expect(result.changes).toContain(
    'uses-feature(android.hardware.gamepad)@android:required = "false"',
  );
});

test('a feature edited above the leanback declaration keeps the insertion point intact', () => {
  const declared = fixtureWith(
    MANIFEST,
    '    <!-- AndroidTV support -->\n    <uses-feature',
    '    <uses-feature android:name="android.hardware.gamepad" android:required="true" />\n' +
      '    <!-- AndroidTV support -->\n    <uses-feature',
  );
  expect(patchAndroidManifest(declared).text).toContain(
    'android:name="android.software.leanback" android:required="false" />\n' +
      '    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />\n',
  );
});

test.each([
  ['<application', '<app', 'exactly one <application> start tag'],
  [
    'android:name=".MainActivity"',
    'android:name=".OtherActivity"',
    '<activity android:name=".MainActivity"> start tag',
  ],
  ['"android.software.leanback"', '"android.software.other"', 'android.software.leanback'],
])('a manifest without %j names the missing anchor', (search, replacement, anchor) => {
  expect(() => patchAndroidManifest(fixtureWith(MANIFEST, search, replacement))).toThrow(
    `anchor not found: `,
  );
  expect(() => patchAndroidManifest(fixtureWith(MANIFEST, search, replacement))).toThrow(anchor);
});

test('a second <application> start tag is ambiguous and fails', () => {
  const doubled = fixtureWith(
    MANIFEST,
    '</manifest>',
    '<application android:label="x"></application>\n</manifest>',
  );
  expect(() => patchAndroidManifest(doubled)).toThrow(
    'anchor not found: exactly one <application> start tag in AndroidManifest.xml',
  );
});
