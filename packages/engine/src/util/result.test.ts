import { expect, test } from 'vitest';
import { err, ok } from './result.ts';
import type { Result } from './result.ts';

test('ok wraps a value and err wraps an error', () => {
  expect(ok(3)).toEqual({ ok: true, value: 3 });
  expect(err('broken')).toEqual({ ok: false, error: 'broken' });
});

test('the ok flag discriminates the union', () => {
  const parse = (text: string): Result<number, string> =>
    /^\d+$/.test(text) ? ok(Number(text)) : err(`not a number: ${text}`);
  const good = parse('42');
  const bad = parse('x');
  expect(good.ok && good.value).toBe(42);
  expect(!bad.ok && bad.error).toBe('not a number: x');
});
