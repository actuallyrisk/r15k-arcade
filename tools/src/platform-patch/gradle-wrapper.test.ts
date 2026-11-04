import { expect, test } from 'vitest';
import { GRADLE_DISTRIBUTION_SHA256, patchGradleWrapper } from './gradle-wrapper.ts';
import { expected, fixture, fixtureWith } from './test-support/fixtures.ts';

const WRAPPER = 'android/gradle-wrapper.properties';

test('the checksum of Gradle 9.6.1 is the reviewed one', () => {
  expect(GRADLE_DISTRIBUTION_SHA256['9.6.1']).toBe(
    '9c0f7faeeb306cb14e4279a3e084ca6b596894089a0638e68a07c945a32c9e14',
  );
});

test('the generated wrapper properties get the checksum right after distributionUrl', () => {
  const result = patchGradleWrapper(fixture(WRAPPER));
  expect(result.text).toBe(expected(WRAPPER));
  expect(result.changes).toEqual([
    'distributionSha256Sum = 9c0f7faeeb306cb14e4279a3e084ca6b596894089a0638e68a07c945a32c9e14 (Gradle 9.6.1)',
  ]);
});

test('patching the patched wrapper properties changes nothing', () => {
  expect(patchGradleWrapper(expected(WRAPPER))).toEqual({ text: expected(WRAPPER), changes: [] });
});

test('a wrong existing checksum is replaced', () => {
  const wrong = fixtureWith(
    WRAPPER,
    'distributionPath=',
    `distributionSha256Sum=${'0'.repeat(64)}\ndistributionPath=`,
  );
  expect(patchGradleWrapper(wrong).text).toBe(expected(WRAPPER));
});

test('an unknown Gradle version fails until its checksum is reviewed', () => {
  const newer = fixtureWith(WRAPPER, 'gradle-9.6.1-bin.zip', 'gradle-9.7.0-bin.zip');
  expect(() => patchGradleWrapper(newer)).toThrow(
    'anchor not found: a reviewed SHA-256 for Gradle 9.7.0 (GRADLE_DISTRIBUTION_SHA256) in gradle-wrapper.properties',
  );
});

test('a missing distributionUrl line names the anchor', () => {
  const missing = fixtureWith(WRAPPER, 'distributionUrl=', '#distributionUrl=');
  expect(() => patchGradleWrapper(missing)).toThrow(
    'anchor not found: exactly one distributionUrl= line in gradle-wrapper.properties',
  );
});

test('an -all distribution is not a known anchor', () => {
  const all = fixtureWith(WRAPPER, '-bin.zip', '-all.zip');
  expect(() => patchGradleWrapper(all)).toThrow('gradle-<version>-bin.zip');
});
