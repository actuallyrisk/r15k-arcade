import { expect, test, vi } from 'vitest';
import type { CommandResult } from '../shared/run-command.ts';
import { isOnPath, runStep } from './run-step.ts';
import type { StepEnvironment } from './run-step.ts';
import type { StepCommand, VerifyStep } from './steps.ts';

const PNPM_LINT: StepCommand = { kind: 'pnpm', args: ['run', 'lint'] };
const GITLEAKS: StepCommand = { kind: 'program', command: 'gitleaks', args: ['dir', '.'] };

/** A step running the given commands. */
const stepOf = (
  commands: readonly StepCommand[],
  requires: readonly string[] = [],
): VerifyStep => ({
  id: 'lint',
  requires,
  commands: () => commands,
  allowedWarnings: [],
});

/** An environment answering every command with the next result. */
const environmentOf = (
  results: readonly CommandResult[],
  installed: readonly string[] = [],
): StepEnvironment & { readonly run: ReturnType<typeof vi.fn> } => {
  const queue = [...results];
  return {
    run: vi.fn((): CommandResult => queue.shift() ?? { status: 0, stdout: '', stderr: '' }),
    isOnPath: (name: string) => installed.includes(name),
  };
};

test('a step whose commands exit 0 without warnings passes', () => {
  const environment = environmentOf([{ status: 0, stdout: 'all good\n', stderr: '' }]);
  const result = runStep(stepOf([PNPM_LINT]), { isCi: false, environment });
  expect(result).toMatchObject({
    id: 'lint',
    status: 'PASS',
    note: '',
    output: 'all good\n',
    warnings: [],
  });
  expect(result.durationMs).toBeGreaterThanOrEqual(0);
  expect(environment.run).toHaveBeenCalledWith(PNPM_LINT);
});

test('a non-zero exit code fails the step, and every command still runs', () => {
  const environment = environmentOf([
    { status: 2, stdout: '', stderr: 'broken\n' },
    { status: 0, stdout: 'second\n', stderr: '' },
  ]);
  const result = runStep(stepOf([PNPM_LINT, PNPM_LINT]), { isCi: false, environment });
  expect(result).toMatchObject({ status: 'FAIL', note: 'exit code 2', output: 'broken\nsecond\n' });
  expect(environment.run).toHaveBeenCalledTimes(2);
});

test('a warning line fails a step that exited 0', () => {
  const environment = environmentOf([
    { status: 0, stdout: 'built\n', stderr: ' WARN  something\n' },
  ]);
  const result = runStep(stepOf([PNPM_LINT]), { isCi: false, environment });
  expect(result).toMatchObject({
    status: 'FAIL',
    note: '1 warning line(s)',
    warnings: ['WARN  something'],
  });
});

test('a missing program skips the step locally without running anything', () => {
  const environment = environmentOf([]);
  const result = runStep(stepOf([GITLEAKS], ['gitleaks']), { isCi: false, environment });
  expect(result).toMatchObject({
    status: 'SKIPPED',
    note: 'gitleaks not installed – runs in CI',
    output: '',
  });
  expect(environment.run).not.toHaveBeenCalled();
});

test('with --ci a missing program fails the step', () => {
  const result = runStep(stepOf([GITLEAKS], ['actionlint', 'shellcheck']), {
    isCi: true,
    environment: environmentOf([], ['shellcheck']),
  });
  expect(result).toMatchObject({
    status: 'FAIL',
    note: 'actionlint not installed – required with --ci',
  });
});

test('an installed program runs the step', () => {
  const environment = environmentOf(
    [{ status: 0, stdout: 'no leaks found\n', stderr: '' }],
    ['gitleaks'],
  );
  expect(runStep(stepOf([GITLEAKS], ['gitleaks']), { isCi: true, environment }).status).toBe(
    'PASS',
  );
});

test('isOnPath finds programs on PATH and nothing else', () => {
  expect(isOnPath('node')).toBe(true);
  expect(isOnPath('r15k-no-such-program')).toBe(false);
});
