import { expect, test } from 'vitest';
import { patchReleaseSigning } from './android-gradle.ts';
import { expected, fixture, fixtureWith } from './test-support/fixtures.ts';

const GRADLE = 'android/build.gradle.kts';
const KEYSTORE = '/home/runner/work/_temp/keystore.properties';

test('release signing is inserted before buildTypes and used by the release build type', () => {
  const result = patchReleaseSigning(fixture(GRADLE), KEYSTORE);
  expect(result.text).toBe(expected(GRADLE));
  expect(result.changes).toEqual([
    `android.signingConfigs.release from ${KEYSTORE}`,
    'android.buildTypes.release.signingConfig = signingConfigs.release',
  ]);
});

test('a second run changes nothing', () => {
  expect(patchReleaseSigning(expected(GRADLE), KEYSTORE)).toEqual({
    text: expected(GRADLE),
    changes: [],
  });
});

test('a run with another keystore path replaces the marked lines instead of adding them twice', () => {
  const result = patchReleaseSigning(expected(GRADLE), '/tmp/other.properties');
  expect(result.text.match(/signingConfigs \{/g)).toHaveLength(1);
  expect(result.text.match(/signingConfig = /g)).toHaveLength(1);
  expect(result.text).toContain('file("/tmp/other.properties")');
});

test('quotes, backslashes and dollar signs in the path are escaped for Kotlin', () => {
  const result = patchReleaseSigning(fixture(GRADLE), 'C:\\keys\\"$x".properties');
  expect(result.text).toContain('file("C:\\\\keys\\\\\\"\\$x\\".properties")');
});

test.each([
  ['\nandroid {\n', '\nandroidx {\n', 'exactly one android { block'],
  ['    buildTypes {\n', '    buildKinds {\n', 'exactly one buildTypes { block'],
  ['getByName("release") {', 'getByName("staging") {', 'exactly one getByName("release") { block'],
])('a build file without %j names the missing anchor', (search, replacement, anchor) => {
  expect(() => patchReleaseSigning(fixtureWith(GRADLE, search, replacement), KEYSTORE)).toThrow(
    `anchor not found: ${anchor} in build.gradle.kts`,
  );
});
