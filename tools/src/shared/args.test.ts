import { expect, test } from 'vitest';
import { parseArgs } from './args.ts';

test('flags and options are told apart by the token that follows', () => {
  const { flags, values } = parseArgs(['--ci', '--step', 'lint', '--only', 'ui-', '--force']);
  expect([...flags]).toEqual(['ci', 'force']);
  expect(Object.fromEntries(values)).toEqual({ step: 'lint', only: 'ui-' });
});

test('an option name without a value is a flag', () => {
  const { flags, values } = parseArgs(['--step']);
  expect([...flags]).toEqual(['step']);
  expect(values.size).toBe(0);
});

test('a value may start with a single dash', () => {
  expect(parseArgs(['--offset', '-3']).values.get('offset')).toBe('-3');
});

test('an empty command line has no flags and no options', () => {
  const { flags, values } = parseArgs([]);
  expect(flags.size + values.size).toBe(0);
});

test.each([['apply'], ['--platform', 'android', 'extra'], ['--']])(
  'positional arguments %j throw',
  (...argv) => {
    expect(() => parseArgs(argv)).toThrow('unexpected argument');
  },
);
