// R15K Arcade tools – runs one verify step: pnpm commands through runPnpm, other programs through
// runCommand (never a shell with an argument array). A step fails on a non-zero exit code or on a warning
// line in its output; it is skipped when a required program is missing (a failure with --ci).
import { statSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { runCommand, runPnpm } from '../shared/run-command.ts';
import type { CommandResult } from '../shared/run-command.ts';
import type { StepCommand, StepId, VerifyStep } from './steps.ts';
import { findWarningLines } from './warnings.ts';

/** Outcome of a step. */
export type StepStatus = 'PASS' | 'FAIL' | 'SKIPPED';

/** What a step did. */
export interface StepResult {
  readonly id: StepId;
  readonly status: StepStatus;
  readonly durationMs: number;
  /** Reason shown next to the status ('' for a clean pass). */
  readonly note: string;
  /** Combined stdout and stderr of every command. */
  readonly output: string;
  /** Warning lines found in the output. */
  readonly warnings: readonly string[];
}

/** How commands are run and programs found (injectable for tests). */
export interface StepEnvironment {
  readonly run: (command: StepCommand) => CommandResult;
  readonly isOnPath: (program: string) => boolean;
}

/** What runCommand can start without a shell on Windows (the same search as libuv's). */
const WINDOWS_EXTENSIONS: readonly string[] = ['.com', '.exe'];
const EXECUTE_BITS = 0o111;

/** Whether a path is a file that can be executed (on Windows the extension decides). */
function isExecutableFile(path: string): boolean {
  const stats = statSync(path, { throwIfNoEntry: false });
  if (stats?.isFile() !== true) {
    return false;
  }
  return process.platform === 'win32' || (stats.mode & EXECUTE_BITS) !== 0;
}

/** Whether runCommand can start a program by name from PATH (on Windows a .com or .exe file). */
export function isOnPath(program: string): boolean {
  const extensions = process.platform === 'win32' ? WINDOWS_EXTENSIONS : [''];
  const directories = (process.env['PATH'] ?? '').split(delimiter).filter((dir) => dir !== '');
  return directories.some((dir) =>
    extensions.some((ext) => isExecutableFile(join(dir, `${program}${ext}`))),
  );
}

/** The real environment: commands run in the repository root. */
export const SYSTEM_ENVIRONMENT: StepEnvironment = {
  run: (command) =>
    command.kind === 'pnpm' ? runPnpm(command.args) : runCommand(command.command, command.args),
  isOnPath,
};

/** The note of a failed or passed step. */
function noteFor(results: readonly CommandResult[], warnings: readonly string[]): string {
  const failed = results.filter((result) => result.status !== 0);
  if (failed.length > 0) {
    return `exit code ${failed.map((result) => result.status).join(', ')}`;
  }
  return warnings.length > 0 ? `${warnings.length} warning line(s)` : '';
}

/** Runs every command of a step (all of them, so one run shows every finding). */
export function runStep(
  step: VerifyStep,
  options: { readonly isCi: boolean; readonly environment?: StepEnvironment },
): StepResult {
  const environment = options.environment ?? SYSTEM_ENVIRONMENT;
  const started = process.hrtime.bigint();
  const elapsedMs = (): number => Number(process.hrtime.bigint() - started) / 1e6;
  const missing = step.requires.find((name) => !environment.isOnPath(name));
  if (missing !== undefined) {
    const note = options.isCi
      ? `${missing} not installed – required with --ci`
      : `${missing} not installed – runs in CI`;
    const status = options.isCi ? 'FAIL' : 'SKIPPED';
    return { id: step.id, status, durationMs: elapsedMs(), note, output: '', warnings: [] };
  }
  const results = step.commands({ isCi: options.isCi }).map((command) => environment.run(command));
  const output = results.map((result) => `${result.stdout}${result.stderr}`).join('');
  const warnings = findWarningLines(output, step.allowedWarnings);
  const isFailed = warnings.length > 0 || results.some((result) => result.status !== 0);
  return {
    id: step.id,
    status: isFailed ? 'FAIL' : 'PASS',
    durationMs: elapsedMs(),
    note: noteFor(results, warnings),
    output,
    warnings,
  };
}
