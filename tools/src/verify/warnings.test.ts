import { expect, test } from 'vitest';
import { findWarningLines, WARNING_PATTERN } from './warnings.ts';

const ESC = String.fromCharCode(0x1b);

test.each([
  '(node:12345) [DEP0190] DeprecationWarning: Passing args to a child process with shell option true can lead to security vulnerabilities, as the arguments are not escaped, only concatenated.',
  '(node:1) Warning: something happened',
  '(node:4321) ExperimentalWarning: glob is an experimental feature',
  ' WARN  Unsupported engine: wanted: {"pnpm":"^11"} (current: {"node":"v24.19.0","pnpm":"12.16.1"})',
  '[WARN] Tarball download average speed 18 KiB/s',
  '(!) Some chunks are larger than 500 kB after minification.',
  'warning: unused variable',
  'Warning: icon has transparency',
  'Warn: input image is not square',
  'WARN deprecated package',
  `${ESC}[33mWARN${ESC}[39m coloured pnpm warning`,
])('%j is a warning line', (line) => {
  expect(findWarningLines(`first line\n${line}\nlast line`)).toHaveLength(1);
});

test.each([
  '0 warnings',
  '✖ 0 problems (0 errors, 0 warnings)',
  'eslint . --max-warnings 0',
  'packages/ui/src/warning-badge.ts',
  '  src/warnings.ts:12:3',
  'Warnings: none',
  '(node:1) not a process warning',
])('%j is not a warning line', (line) => {
  expect(WARNING_PATTERN.test(line)).toBe(false);
  expect(findWarningLines(line)).toEqual([]);
});

test('Windows line endings and surrounding blanks are handled, the lines come back trimmed', () => {
  expect(findWarningLines('ok\r\n  warning: a\r\nWARN  b\r\n')).toEqual(['warning: a', 'WARN  b']);
});

test('lines on the allow-list are accepted', () => {
  const output = 'warning: expected and accepted\nwarning: not accepted';
  expect(findWarningLines(output, [/expected and accepted/])).toEqual(['warning: not accepted']);
});
