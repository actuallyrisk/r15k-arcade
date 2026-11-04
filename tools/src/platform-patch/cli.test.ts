import { expect, test } from 'vitest';
import { parsePatchCommand, parsePreparePlatform } from './cli.ts';

test('apply and verify command lines parse into typed commands', () => {
  expect(parsePatchCommand(['apply', '--platform', 'android'])).toEqual({ kind: 'apply-android' });
  expect(
    parsePatchCommand(['apply', '--platform', 'android', '--release-signing', 'k.properties']),
  ).toEqual({ kind: 'apply-android', releaseSigning: 'k.properties' });
  expect(parsePatchCommand(['apply', '--platform', 'ios'])).toEqual({ kind: 'apply-ios' });
  expect(
    parsePatchCommand([
      ...['verify', '--platform', 'android', '--aapt2', 'a', '--apkanalyzer', 'b'],
      ...['--apk', 'c.apk'],
    ]),
  ).toEqual({ kind: 'verify-android', aapt2: 'a', apkanalyzer: 'b', apk: 'c.apk' });
  expect(parsePatchCommand(['verify', '--platform', 'macos', '--app', 'X.app'])).toEqual({
    kind: 'verify-apple',
    platform: 'macos',
    app: 'X.app',
  });
});

test.each([
  [[], 'unknown command: (none)'],
  [['apply', '--platform', 'windows'], 'unknown command: apply windows'],
  [
    ['apply', '--platform', 'ios', '--release-signing', 'k'],
    'unknown option(s): --release-signing',
  ],
  [['verify', '--platform', 'android', '--apk', 'c.apk'], 'missing option --aapt2'],
  [['verify', '--platform', 'ios', '--app'], 'option(s) without a value: --app'],
  [['apply', 'android'], "unexpected argument 'android'"],
])('the command line %j is a usage error', (argv, message) => {
  expect(() => parsePatchCommand(argv)).toThrow(message);
});

test('native:prepare takes exactly one known platform', () => {
  expect(parsePreparePlatform(['--platform', 'android'])).toBe('android');
  expect(parsePreparePlatform(['--platform', 'ios'])).toBe('ios');
  expect(() => parsePreparePlatform(['--platform', 'macos'])).toThrow('unknown platform: macos');
  expect(() => parsePreparePlatform([])).toThrow('missing option --platform');
  expect(() => parsePreparePlatform(['--platform', 'ios', '--x', '1'])).toThrow('--x');
});
