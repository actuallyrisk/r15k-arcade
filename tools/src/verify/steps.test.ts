import { expect, test } from 'vitest';
import { VERIFY_STEPS } from './steps.ts';
import type { StepCommand, StepId } from './steps.ts';

/** The step with an id. */
const stepById = (id: StepId): (typeof VERIFY_STEPS)[number] => {
  const found = VERIFY_STEPS.find((step) => step.id === id);
  if (found === undefined) {
    throw new Error(`no step ${id}`);
  }
  return found;
};

/** A command as one line, e.g. 'pnpm run lint'. */
const line = (command: StepCommand): string =>
  command.kind === 'pnpm'
    ? ['pnpm', ...command.args].join(' ')
    : [command.command, ...command.args].join(' ');

test('the steps run in the order of the CI checks job', () => {
  expect(VERIFY_STEPS.map((step) => step.id)).toEqual([
    ...[
      'typecheck',
      'lint',
      'format',
      'todo-check',
      'test',
      'sprite-check',
      'i18n-check',
      'assets',
    ],
    ...[
      'build',
      'size-budget',
      'licences',
      'icons',
      'actionlint',
      'gitleaks',
      'cargo-fmt',
      'clippy',
    ],
  ]);
});

test.each([
  ['typecheck', 'pnpm run typecheck'],
  ['lint', 'pnpm run lint'],
  ['format', 'pnpm run format:check'],
  ['todo-check', 'pnpm run todo-check'],
  ['test', 'pnpm run test:coverage'],
  ['sprite-check', 'pnpm run sprite-check'],
  ['i18n-check', 'pnpm run i18n-check'],
  ['assets', 'pnpm run assets'],
  ['build', 'pnpm --filter @r15k/arcade build'],
  ['size-budget', 'pnpm run size-budget'],
  ['licences', 'pnpm run licences'],
  ['icons', 'pnpm run icons'],
  ['gitleaks', 'gitleaks dir . --config .gitleaks.toml --redact --no-banner'],
  ['cargo-fmt', 'cargo fmt --manifest-path apps/arcade/src-tauri/Cargo.toml --all --check'],
  [
    'clippy',
    'cargo clippy --manifest-path apps/arcade/src-tauri/Cargo.toml --workspace --all-targets --locked -- -D warnings',
  ],
] as const)('%s runs %j', (id, expected) => {
  expect(stepById(id).commands({ isCi: false }).map(line)).toEqual([expected]);
});

test('with --ci the licence report requires the Rust part', () => {
  expect(stepById('licences').commands({ isCi: true }).map(line)).toEqual([
    'pnpm run licences --require-rust',
  ]);
});

test('actionlint runs first and shellcheck only lints the shell scripts', () => {
  const lines = stepById('actionlint').commands({ isCi: false }).map(line);
  expect(lines[0]).toBe('actionlint -shellcheck shellcheck');
  expect(lines.slice(1).every((command) => command.startsWith('shellcheck .github/scripts/'))).toBe(
    true,
  );
});

test('only the CI tool steps require programs on PATH', () => {
  const required = Object.fromEntries(
    VERIFY_STEPS.filter((step) => step.requires.length > 0).map((step) => [step.id, step.requires]),
  );
  expect(required).toEqual({
    actionlint: ['actionlint', 'shellcheck'],
    gitleaks: ['gitleaks'],
    'cargo-fmt': ['cargo'],
    clippy: ['cargo'],
  });
});

test('no step accepts warning lines yet', () => {
  expect(VERIFY_STEPS.flatMap((step) => step.allowedWarnings)).toEqual([]);
});
