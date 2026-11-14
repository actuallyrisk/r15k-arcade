// R15K Arcade tools – the steps of `pnpm verify`, in the order of the CI checks job (one CI step per
// verify step, so local and CI commands are identical). The last four steps need tools that are installed
// only in CI; locally they are skipped when the tool is missing.
import { existsSync, readdirSync } from 'node:fs';
import { repoPath } from '../shared/repo-paths.ts';

/** Identifier of a verify step (`pnpm verify --step <id>`). */
export type StepId =
  | 'typecheck'
  | 'lint'
  | 'format'
  | 'todo-check'
  | 'test'
  | 'sprite-check'
  | 'i18n-check'
  | 'assets'
  | 'build'
  | 'size-budget'
  | 'licences'
  | 'icons'
  | 'actionlint'
  | 'gitleaks'
  | 'cargo-fmt'
  | 'clippy';

/** One command of a step: a pnpm invocation (started with runPnpm) or another program (runCommand). */
export type StepCommand =
  | { readonly kind: 'pnpm'; readonly args: readonly string[] }
  | { readonly kind: 'program'; readonly command: string; readonly args: readonly string[] };

/** What the commands of a step may depend on. */
export interface StepContext {
  /** `--ci`: everything must run, the Rust licence report included. */
  readonly isCi: boolean;
}

/** One verify step. */
export interface VerifyStep {
  readonly id: StepId;
  /** Programs that must be on PATH; a missing one skips the step (fails it with --ci). */
  readonly requires: readonly string[];
  readonly commands: (context: StepContext) => readonly StepCommand[];
  /** Output lines that match the warning pattern but are accepted (none yet). */
  readonly allowedWarnings: readonly RegExp[];
}

const CARGO_MANIFEST = 'apps/arcade/src-tauri/Cargo.toml';

/** Runs a root package script. */
const script = (name: string, ...args: readonly string[]): StepCommand => ({
  kind: 'pnpm',
  args: ['run', name, ...args],
});

/** Runs a program from PATH. */
const program = (command: string, args: readonly string[]): StepCommand => ({
  kind: 'program',
  command,
  args,
});

/** A step that needs nothing but pnpm and runs a fixed command list. */
const pnpmStep = (id: StepId, commands: readonly StepCommand[]): VerifyStep => ({
  id,
  requires: [],
  commands: () => commands,
  allowedWarnings: [],
});

/** The shell scripts that shellcheck lints (.github/scripts/*.sh), repository-relative. */
function shellScripts(): readonly string[] {
  const folder = repoPath('.github', 'scripts');
  if (!existsSync(folder)) {
    return [];
  }
  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sh'))
    .map((entry) => `.github/scripts/${entry.name}`)
    .sort();
}

/** actionlint over the workflows (with shellcheck for run blocks), then shellcheck over the scripts. */
function actionlintCommands(): readonly StepCommand[] {
  const scripts = shellScripts();
  const lint = program('actionlint', ['-shellcheck', 'shellcheck']);
  return scripts.length === 0 ? [lint] : [lint, program('shellcheck', scripts)];
}

/** Every verify step in CI order. */
export const VERIFY_STEPS: readonly VerifyStep[] = [
  pnpmStep('typecheck', [script('typecheck')]),
  pnpmStep('lint', [script('lint')]),
  pnpmStep('format', [script('format:check')]),
  pnpmStep('todo-check', [script('todo-check')]),
  pnpmStep('test', [script('test:coverage')]),
  pnpmStep('sprite-check', [script('sprite-check')]),
  pnpmStep('i18n-check', [script('i18n-check')]),
  pnpmStep('assets', [script('assets')]),
  pnpmStep('build', [{ kind: 'pnpm', args: ['--filter', '@r15k/arcade', 'build'] }]),
  pnpmStep('size-budget', [script('size-budget')]),
  {
    ...pnpmStep('licences', []),
    commands: ({ isCi }) => [isCi ? script('licences', '--require-rust') : script('licences')],
  },
  pnpmStep('icons', [script('icons')]),
  {
    ...pnpmStep('actionlint', []),
    requires: ['actionlint', 'shellcheck'],
    commands: actionlintCommands,
  },
  {
    ...pnpmStep('gitleaks', []),
    requires: ['gitleaks'],
    commands: () => [
      program('gitleaks', ['dir', '.', '--config', '.gitleaks.toml', '--redact', '--no-banner']),
    ],
  },
  {
    ...pnpmStep('cargo-fmt', []),
    requires: ['cargo'],
    commands: () => [
      program('cargo', ['fmt', '--manifest-path', CARGO_MANIFEST, '--all', '--check']),
    ],
  },
  {
    ...pnpmStep('clippy', []),
    requires: ['cargo'],
    commands: () => [
      program('cargo', [
        ...[
          'clippy',
          '--manifest-path',
          CARGO_MANIFEST,
          '--workspace',
          '--all-targets',
          '--locked',
        ],
        ...['--', '-D', 'warnings'],
      ]),
    ],
  },
];
