import { expect, test, vi } from 'vitest';
import { exitWith, OUT } from './cli-output.ts';

test('info goes to stdout, warnings and errors go to stderr with their prefixes', () => {
  const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  OUT.info('done');
  OUT.warn('slow');
  OUT.error('broken');
  expect(stdout.mock.calls).toEqual([['done\n']]);
  expect(stderr.mock.calls).toEqual([['warning: slow\n'], ['error: broken\n']]);
});

test('tables pad every column to its widest cell and trim the line end', () => {
  const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  OUT.table([
    ['Step', 'Result'],
    ['typecheck', 'PASS'],
    ['lint', 'FAIL (exit code 1)'],
  ]);
  expect(stdout.mock.calls).toEqual([
    ['Step       Result\ntypecheck  PASS\nlint       FAIL (exit code 1)\n'],
  ]);
});

test('exitWith ends the process with the code', () => {
  const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`exit ${String(code)}`);
  });
  expect(() => exitWith(1)).toThrow('exit 1');
  expect(exit).toHaveBeenCalledWith(1);
});
