import { expect, test } from 'vitest';
import { IOS_INFO_KEYS } from './apple-keys.ts';
import { findInfoPlistPath, patchProjectYml, renderYamlEntry } from './ios-project.ts';
import { expected, fixture, fixtureWith } from './test-support/fixtures.ts';

const SPEC = 'ios/project.yml';

test('the Info.plist path of the app target is read from the XcodeGen spec', () => {
  expect(findInfoPlistPath(fixture(SPEC))).toBe('r15k-arcade_iOS/Info.plist');
});

test('the XcodeGen spec gets every iOS key; the matching orientation lists stay untouched', () => {
  const result = patchProjectYml(fixture(SPEC), IOS_INFO_KEYS);
  expect(result.text).toBe(expected(SPEC));
  expect(result.changes).toHaveLength(8);
  expect(result.changes.join('\n')).not.toContain('UISupportedInterfaceOrientations');
});

test('patching the patched spec changes nothing', () => {
  expect(patchProjectYml(expected(SPEC), IOS_INFO_KEYS)).toEqual({
    text: expected(SPEC),
    changes: [],
  });
});

test('a generated upside-down iPhone orientation is replaced by the platform convention', () => {
  const upsideDown = fixtureWith(
    SPEC,
    '        UISupportedInterfaceOrientations:\n          - UIInterfaceOrientationPortrait\n',
    '        UISupportedInterfaceOrientations:\n          - UIInterfaceOrientationPortrait\n          - UIInterfaceOrientationPortraitUpsideDown\n',
  );
  const result = patchProjectYml(upsideDown, IOS_INFO_KEYS);
  expect(result.text).toBe(expected(SPEC));
  expect(result.changes).toContain(
    'UISupportedInterfaceOrientations = ["UIInterfaceOrientationPortrait","UIInterfaceOrientationLandscapeLeft","UIInterfaceOrientationLandscapeRight"]',
  );
});

test('entries render in the generated style', () => {
  expect(
    renderYamlEntry('GCSupportedGameControllers', [{ ProfileName: 'ExtendedGamepad' }], 8),
  ).toEqual(['        GCSupportedGameControllers:', '          - ProfileName: ExtendedGamepad']);
  expect(renderYamlEntry('Flag', false, 2)).toEqual(['  Flag: false']);
  expect(renderYamlEntry('Text', 'yes', 2)).toEqual(['  Text: "yes"']);
  expect(renderYamlEntry('List', [], 2)).toEqual(['  List: []']);
  expect(renderYamlEntry('Pair', [{ A: 'a b', B: 'c' }], 0)).toEqual([
    'Pair:',
    '  - A: "a b"',
    '    B: c',
  ]);
});

test.each([
  ['      properties:\n', '      extras:\n'],
  ['      path: r15k-arcade_iOS/Info.plist\n', '      path: Info.plist\n'],
  ['    info:\n', '    information:\n'],
])('a spec without %j names the missing anchor', (search, replacement) => {
  expect(() => patchProjectYml(fixtureWith(SPEC, search, replacement), IOS_INFO_KEYS)).toThrow(
    'anchor not found: info: → path: <name>_iOS/Info.plist → properties: in project.yml',
  );
});
