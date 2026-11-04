import { expect, test } from 'vitest';
import type { StepResult } from './run-step.ts';
import { formatDuration, markdownSummary, statusText, summaryRows } from './summary.ts';

const RESULTS: readonly StepResult[] = [
  { id: 'typecheck', status: 'PASS', durationMs: 12_345, note: '', output: '', warnings: [] },
  { id: 'lint', status: 'FAIL', durationMs: 40, note: 'exit code 1', output: 'x', warnings: [] },
  {
    id: 'cargo-fmt',
    status: 'SKIPPED',
    durationMs: 0,
    note: 'cargo not installed – runs in CI',
    output: '',
    warnings: [],
  },
];

test.each([
  [0, '0.0 s'],
  [40, '0.0 s'],
  [950, '0.9 s'],
  [12_345, '12.3 s'],
])('formatDuration(%d) is %j', (durationMs, expected) => {
  expect(formatDuration(durationMs)).toBe(expected);
});

test('the status carries its reason in parentheses', () => {
  expect(RESULTS.map(statusText)).toEqual([
    'PASS',
    'FAIL (exit code 1)',
    'SKIPPED (cargo not installed – runs in CI)',
  ]);
});

test('the terminal table has a header and one row per step', () => {
  expect(summaryRows(RESULTS)).toEqual([
    ['Step', 'Result', 'Duration'],
    ['typecheck', 'PASS', '12.3 s'],
    ['lint', 'FAIL (exit code 1)', '0.0 s'],
    ['cargo-fmt', 'SKIPPED (cargo not installed – runs in CI)', '0.0 s'],
  ]);
});

test('the Markdown table ends with a newline', () => {
  expect(markdownSummary(RESULTS.slice(0, 2))).toBe(
    '| Step | Result | Duration |\n| --- | --- | --- |\n| typecheck | PASS | 12.3 s |\n| lint | FAIL (exit code 1) | 0.0 s |\n',
  );
});
