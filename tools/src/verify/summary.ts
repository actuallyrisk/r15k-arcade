// R15K Arcade tools – the result table of `pnpm verify` (terminal) and its Markdown form for the GitHub
// job summary.
import type { StepResult } from './run-step.ts';

/** Seconds with one decimal, e.g. '12.3 s'. */
export function formatDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(1)} s`;
}

/** The status with its reason, e.g. 'SKIPPED (cargo not installed – runs in CI)'. */
export function statusText(result: StepResult): string {
  return result.note === '' ? result.status : `${result.status} (${result.note})`;
}

/** Header and one row per step, for OUT.table. */
export function summaryRows(results: readonly StepResult[]): readonly (readonly string[])[] {
  return [
    ['Step', 'Result', 'Duration'],
    ...results.map((result) => [result.id, statusText(result), formatDuration(result.durationMs)]),
  ];
}

/** The same table as Markdown. */
export function markdownSummary(results: readonly StepResult[]): string {
  const rows = results.map(
    (result) => `| ${result.id} | ${statusText(result)} | ${formatDuration(result.durationMs)} |`,
  );
  return ['| Step | Result | Duration |', '| --- | --- | --- |', ...rows, ''].join('\n');
}
