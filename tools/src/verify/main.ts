// R15K Arcade tools – `pnpm verify`: runs the steps of the CI checks job in order, keeps going after a
// failure, prints a PASS / FAIL / SKIPPED table and exits 1 if any step failed. `--step <id>` runs one step
// (CI calls it per step); `--ci` turns every SKIPPED into a failure. With GITHUB_STEP_SUMMARY set, the
// table is appended to the job summary.
import { appendFileSync } from 'node:fs';
import { parseArgs } from '../shared/args.ts';
import { exitWith, OUT } from '../shared/cli-output.ts';
import { runStep } from './run-step.ts';
import type { StepResult } from './run-step.ts';
import { VERIFY_STEPS } from './steps.ts';
import type { VerifyStep } from './steps.ts';
import { markdownSummary, statusText, summaryRows } from './summary.ts';

/** The steps selected by the command line; exits with a usage error for unknown arguments. */
function selectedSteps(argv: readonly string[]): {
  readonly steps: readonly VerifyStep[];
  readonly isCi: boolean;
} {
  const { flags, values } = parseArgs(argv);
  const unknown = [...flags].filter((flag) => flag !== 'ci');
  unknown.push(...[...values.keys()].filter((key) => key !== 'step'));
  if (unknown.length > 0) {
    OUT.error(`unknown argument(s): ${unknown.map((name) => `--${name}`).join(' ')}`);
    OUT.error('usage: pnpm verify [--ci] [--step <id>]');
    exitWith(1);
  }
  const only = values.get('step');
  const steps = only === undefined ? VERIFY_STEPS : VERIFY_STEPS.filter((step) => step.id === only);
  if (steps.length === 0) {
    OUT.error(
      `unknown step '${only ?? ''}'; steps: ${VERIFY_STEPS.map((step) => step.id).join(', ')}`,
    );
    exitWith(1);
  }
  return { steps, isCi: flags.has('ci') };
}

/** Runs one step and prints its output and result. */
function runAndReport(step: VerifyStep, isCi: boolean): StepResult {
  OUT.info(`> verify: ${step.id}`);
  const result = runStep(step, { isCi });
  const isLineOpen = result.output !== '' && !result.output.endsWith('\n');
  process.stdout.write(isLineOpen ? `${result.output}\n` : result.output);
  for (const line of result.warnings) {
    OUT.error(`${step.id} printed a warning line: ${line}`);
  }
  OUT.info(`> verify: ${step.id} ${statusText(result)}`);
  return result;
}

const { steps, isCi } = selectedSteps(process.argv.slice(2));
const results = steps.map((step) => runAndReport(step, isCi));
OUT.info('');
OUT.table(summaryRows(results));
const summaryFile = process.env['GITHUB_STEP_SUMMARY'];
if (summaryFile !== undefined && summaryFile !== '') {
  appendFileSync(summaryFile, markdownSummary(results));
}
exitWith(results.some((result) => result.status === 'FAIL') ? 1 : 0);
